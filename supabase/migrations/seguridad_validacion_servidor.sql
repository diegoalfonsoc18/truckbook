-- Validación EN SERVIDOR (hasta ahora solo existía en el cliente) y endurecimiento.
-- Pegar completo en el SQL Editor de Supabase y ejecutar. Es DEFENSIVO: cada CHECK
-- se omite con un NOTICE si falta alguna columna, y los CHECK van NOT VALID (no
-- rompen filas existentes; se aplican a inserts y updates nuevos).
-- Se puede ejecutar más de una vez.

-- ── Ayudante temporal (desaparece al cerrar la sesión del editor) ─────────────
CREATE OR REPLACE FUNCTION pg_temp.add_ck(tabla text, nombre text, expr text, cols text[])
RETURNS void LANGUAGE plpgsql AS $$
DECLARE faltan text;
BEGIN
  SELECT string_agg(c, ', ') INTO faltan
  FROM unnest(cols) AS c
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = tabla AND column_name = c);
  IF faltan IS NOT NULL THEN
    RAISE NOTICE 'OMITIDO % (faltan columnas en %: %)', nombre, tabla, faltan;
    RETURN;
  END IF;
  BEGIN
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%s) NOT VALID', tabla, nombre, expr);
    RAISE NOTICE 'OK %', nombre;
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'ya existe %', nombre;
  END;
END $$;

-- ── 1. anon no debe tocar estas tablas (la RLS ya lo bloquea; defensa en capas) ──
REVOKE ALL ON public.usuarios, public.vehiculos, public.vehiculo_conductores,
              public.conductor_gastos, public.conductor_ingresos FROM anon;

-- ── 2. Montos, fechas y longitudes ───────────────────────────────────────────
SELECT pg_temp.add_ck('conductor_gastos', 'gastos_monto_ck',
  'monto > 0 AND monto <= 999999999', ARRAY['monto']);
SELECT pg_temp.add_ck('conductor_gastos', 'gastos_fecha_ck',
  '(fecha::date) BETWEEN DATE ''2020-01-01'' AND CURRENT_DATE + 366', ARRAY['fecha']);
SELECT pg_temp.add_ck('conductor_gastos', 'gastos_proveedor_ck',
  'proveedor IS NULL OR char_length(proveedor) <= 120', ARRAY['proveedor']);
SELECT pg_temp.add_ck('conductor_gastos', 'gastos_ingresos_ck',
  'ingreso_ids IS NULL OR cardinality(ingreso_ids) <= 50', ARRAY['ingreso_ids']);

SELECT pg_temp.add_ck('conductor_ingresos', 'ingresos_monto_ck',
  'monto > 0 AND monto <= 999999999', ARRAY['monto']);
SELECT pg_temp.add_ck('conductor_ingresos', 'ingresos_flete_ck',
  'flete_monto IS NULL OR (flete_monto >= 0 AND flete_monto <= monto)', ARRAY['flete_monto','monto']);
SELECT pg_temp.add_ck('conductor_ingresos', 'ingresos_fecha_ck',
  '(fecha::date) BETWEEN DATE ''2020-01-01'' AND CURRENT_DATE + 366', ARRAY['fecha']);

SELECT pg_temp.add_ck('vehiculos', 'vehiculos_placa_ck',
  'placa ~ ''^[A-Z0-9]{5,7}$''', ARRAY['placa']);

SELECT pg_temp.add_ck('usuarios', 'usuarios_len_ck',
  'char_length(coalesce(nombre, '''')) <= 100 AND char_length(coalesce(cedula, '''')) <= 20',
  ARRAY['nombre','cedula']);
-- Token de Expo con su formato (se reenvía a exp.host desde la Edge Function)
SELECT pg_temp.add_ck('usuarios', 'usuarios_push_token_ck',
  'push_token IS NULL OR push_token ~ ''^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$''',
  ARRAY['push_token']);

-- foto_path solo dentro de la carpeta del propio usuario
SELECT pg_temp.add_ck('vehiculo_conductores', 'vehiculo_foto_path_ck',
  'foto_path IS NULL OR foto_path LIKE conductor_id::text || ''/%''',
  ARRAY['foto_path','conductor_id']);

-- Si el estado tiene lista cerrada, revisa los valores reales y descomenta:
--   SELECT DISTINCT estado FROM conductor_gastos;  SELECT DISTINCT estado FROM conductor_ingresos;
-- SELECT pg_temp.add_ck('conductor_gastos',   'gastos_estado_ck',   'estado IN (''pendiente'',''aprobado'',''rechazado'')', ARRAY['estado']);
-- SELECT pg_temp.add_ck('conductor_ingresos', 'ingresos_estado_ck', 'estado IN (''pendiente'',''pagado'',''cobrado'')',      ARRAY['estado']);

-- ── 3. usuarios: una cuenta eliminada no se "revive" y el correo sale de Auth ──
CREATE OR REPLACE FUNCTION public.usuarios_proteger() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.deleted AND NOT NEW.deleted THEN
      RAISE EXCEPTION 'cuenta eliminada';
    END IF;
    NEW.user_id := OLD.user_id;
  END IF;
  -- Fuente de verdad: el correo de Auth (salvo cuenta anonimizada)
  IF NOT COALESCE(NEW.deleted, false) THEN
    NEW.email := COALESCE((SELECT email FROM auth.users WHERE id = NEW.user_id), NEW.email);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS usuarios_proteger ON public.usuarios;
CREATE TRIGGER usuarios_proteger BEFORE INSERT OR UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.usuarios_proteger();

-- ── 4. search_path fijo en la función de compras (si existe) ─────────────────
DO $$
BEGIN
  ALTER FUNCTION public.compras_quitar_ingreso_borrado() SET search_path = public;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'compras_quitar_ingreso_borrado no existe: omitido';
END $$;

-- ── 4b. Funciones de trigger: nadie debe poder ejecutarlas directamente ──────
-- (el permiso de ejecución solo se revisa al CREAR el trigger, no al dispararse)
REVOKE EXECUTE ON FUNCTION public.usuarios_proteger() FROM PUBLIC, anon, authenticated;
DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.compras_quitar_ingreso_borrado() FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_function THEN
  NULL;
END $$;

-- ── 5. Auditoría (ejecútalo aparte): lista políticas y funciones reales.
--      Revisa que no haya nada permisivo creado a mano en el dashboard. ────────
-- SELECT tablename, policyname, cmd, roles, qual, with_check
--   FROM pg_policies WHERE schemaname IN ('public','storage') ORDER BY 1,2;
-- SELECT p.proname, p.prosecdef, p.proconfig, has_function_privilege('anon', p.oid, 'execute')
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public';

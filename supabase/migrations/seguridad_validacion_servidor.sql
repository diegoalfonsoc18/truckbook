-- Validación EN SERVIDOR (hasta ahora solo existía en el cliente) y endurecimiento.
-- Ejecutar a mano en el SQL Editor de Supabase. Revísalo antes: los CHECK van
-- NOT VALID (no rompen filas existentes) y se validan al final.
--
-- ANTES DE EJECUTAR, comprueba en `information_schema.columns` que las columnas
-- existen con estos nombres, y ajusta rangos si tu negocio los necesita distintos.

-- ── 1. anon no debe tocar estas tablas (la RLS ya lo bloquea; defensa en capas) ──
REVOKE ALL ON public.usuarios, public.vehiculos, public.vehiculo_conductores,
              public.conductor_gastos, public.conductor_ingresos FROM anon;

-- ── 2. CHECK de montos, fechas y longitudes ───────────────────────────────────
ALTER TABLE public.conductor_gastos
  ADD CONSTRAINT gastos_monto_ck  CHECK (monto > 0 AND monto <= 999999999) NOT VALID,
  ADD CONSTRAINT gastos_fecha_ck  CHECK (fecha BETWEEN DATE '2020-01-01' AND CURRENT_DATE + 366) NOT VALID,
  ADD CONSTRAINT gastos_proveedor_ck CHECK (proveedor IS NULL OR char_length(proveedor) <= 120) NOT VALID,
  ADD CONSTRAINT gastos_ingresos_ck  CHECK (ingreso_ids IS NULL OR cardinality(ingreso_ids) <= 50) NOT VALID;

ALTER TABLE public.conductor_ingresos
  ADD CONSTRAINT ingresos_monto_ck CHECK (monto > 0 AND monto <= 999999999) NOT VALID,
  ADD CONSTRAINT ingresos_flete_ck CHECK (flete_monto IS NULL OR (flete_monto >= 0 AND flete_monto <= monto)) NOT VALID,
  ADD CONSTRAINT ingresos_fecha_ck CHECK (fecha BETWEEN DATE '2020-01-01' AND CURRENT_DATE + 366) NOT VALID;

ALTER TABLE public.vehiculos
  ADD CONSTRAINT vehiculos_placa_ck CHECK (placa ~ '^[A-Z0-9]{5,7}$') NOT VALID;

ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_len_ck CHECK (
    char_length(coalesce(nombre, '')) <= 100 AND char_length(coalesce(cedula, '')) <= 20
  ) NOT VALID,
  -- Token de Expo con su formato (se reenvía a exp.host desde la Edge Function)
  ADD CONSTRAINT usuarios_push_token_ck CHECK (
    push_token IS NULL OR push_token ~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$'
  ) NOT VALID;

-- Si el estado tiene lista cerrada, descomenta y ajusta:
-- ALTER TABLE public.conductor_gastos   ADD CONSTRAINT gastos_estado_ck   CHECK (estado IN ('pendiente','aprobado','rechazado')) NOT VALID;
-- ALTER TABLE public.conductor_ingresos ADD CONSTRAINT ingresos_estado_ck CHECK (estado IN ('pendiente','pagado','cobrado')) NOT VALID;

-- Cuando confirmes que no hay filas viejas fuera de rango, valida:
-- ALTER TABLE public.conductor_gastos   VALIDATE CONSTRAINT gastos_monto_ck;  (y los demás)

-- ── 3. foto_path solo dentro de la carpeta del propio usuario ─────────────────
ALTER TABLE public.vehiculo_conductores
  ADD CONSTRAINT vehiculo_foto_path_ck
  CHECK (foto_path IS NULL OR foto_path LIKE conductor_id::text || '/%') NOT VALID;

-- ── 4. usuarios: una cuenta eliminada no se "revive" y el email sale de Auth ──
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

-- ── 5. search_path fijo en la función de compras ──────────────────────────────
ALTER FUNCTION public.compras_quitar_ingreso_borrado() SET search_path = public;

-- ── 6. Auditoría: lista políticas y funciones reales (revisa que no haya nada
--      permisivo creado a mano en el dashboard) ────────────────────────────────
-- SELECT tablename, policyname, cmd, roles, qual, with_check
--   FROM pg_policies WHERE schemaname IN ('public','storage') ORDER BY 1,2;
-- SELECT p.proname, p.prosecdef, p.proconfig, has_function_privilege('anon', p.oid, 'execute')
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public';

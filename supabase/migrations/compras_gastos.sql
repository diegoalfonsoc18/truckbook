-- Compras de mercancía dentro de Gastos.
--
-- CASO: el conductor compra mercancía (ej. arena) con SU dinero para
-- revendérsela a un cliente. Ese dinero hay que poder recuperarlo, y el
-- reporte no debe mostrar la reventa completa como ganancia.
--
-- CAMBIOS
-- conductor_gastos
--   proveedor    text NULL        a quién se le compró la mercancía.
--   recuperado   boolean NOT NULL DEFAULT false
--                                 true cuando la compra ya se recuperó: se
--                                 incluyó en una cuenta de cobro o se ligó a
--                                 uno o más ingresos de reventa. NO es lo mismo
--                                 que `estado` (`estado` = si ya se le pagó al
--                                 proveedor). Toda compra nace con false.
--   ingreso_ids  uuid[] NOT NULL DEFAULT '{}'
--                                 (opcional) ingresos de reventa con los que se
--                                 liga la compra, para ver la ganancia de esa
--                                 mercancía con y sin flete. Una compra puede
--                                 ligarse a VARIOS ingresos (p. ej. el de
--                                 Mercancía y el de Flete) y un ingreso puede
--                                 estar en VARIAS compras. Sin FK (los arrays no
--                                 la admiten): la app ignora ids que ya no
--                                 existan y el trigger de abajo limpia el id
--                                 cuando se borra el ingreso.
-- conductor_ingresos
--   flete_monto  numeric NULL     parte del ingreso que corresponde a flete
--                                 cuando es un ingreso mixto (categoría
--                                 Mercancía que incluye el flete).
--
-- Seguro sobre datos existentes:
--  * Todo es NULLABLE o NOT NULL con default: las filas actuales quedan igual
--    y los builds viejos (que no envían estas columnas) siguen funcionando.
--  * No toca RLS ni políticas: las de conductor_gastos / conductor_ingresos son
--    por conductor_id y cubren las columnas nuevas sin cambios.
--
-- Ejecutar UNA VEZ en Supabase SQL Editor. Es idempotente (IF NOT EXISTS).
-- Orden: 1) correr este SQL  2) publicar el build nuevo de la app.
-- (Si el build nuevo sale antes, los inserts/updates que envíen columnas nuevas
-- fallarán por columna inexistente.)

ALTER TABLE public.conductor_gastos   ADD COLUMN IF NOT EXISTS proveedor   text;
ALTER TABLE public.conductor_gastos   ADD COLUMN IF NOT EXISTS recuperado  boolean NOT NULL DEFAULT false;
ALTER TABLE public.conductor_ingresos ADD COLUMN IF NOT EXISTS flete_monto numeric;

-- ingreso_ids: arreglo del MISMO tipo que conductor_ingresos.id (uuid en
-- Supabase por defecto), para no asumir el tipo.
DO $$
DECLARE
  tipo_id text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'conductor_gastos'
      AND column_name = 'ingreso_ids'
  ) THEN
    SELECT format_type(a.atttypid, a.atttypmod) INTO tipo_id
    FROM pg_attribute a
    WHERE a.attrelid = 'public.conductor_ingresos'::regclass
      AND a.attname = 'id' AND NOT a.attisdropped;

    EXECUTE format(
      'ALTER TABLE public.conductor_gastos ADD COLUMN ingreso_ids %s[] NOT NULL DEFAULT ''{}''',
      tipo_id
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS conductor_gastos_ingreso_ids_gin
  ON public.conductor_gastos USING gin (ingreso_ids);

-- Al borrar un ingreso se quita de las compras que lo tenían ligado; si la
-- compra se queda sin ingresos vuelve a "por recuperar". Limitación: una compra
-- ya recuperada por cuenta de cobro y ligada también a ese ingreso también vuelve
-- a false (no se distingue el origen de `recuperado`).
-- No es SECURITY DEFINER: corre con los permisos de quien borra, así que RLS
-- limita el UPDATE a sus propias compras (y además se filtra por conductor_id).
CREATE OR REPLACE FUNCTION public.compras_quitar_ingreso_borrado()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  UPDATE public.conductor_gastos
  SET ingreso_ids = array_remove(ingreso_ids, OLD.id),
      recuperado  = CASE
                      WHEN cardinality(array_remove(ingreso_ids, OLD.id)) = 0 THEN false
                      ELSE recuperado
                    END
  WHERE conductor_id = OLD.conductor_id
    AND ingreso_ids @> ARRAY[OLD.id];
  RETURN OLD;
END;
$fn$;

DROP TRIGGER IF EXISTS conductor_ingresos_quitar_de_compras ON public.conductor_ingresos;
CREATE TRIGGER conductor_ingresos_quitar_de_compras
  AFTER DELETE ON public.conductor_ingresos
  FOR EACH ROW
  EXECUTE FUNCTION public.compras_quitar_ingreso_borrado();

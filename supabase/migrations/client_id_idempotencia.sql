-- Idempotencia de inserts offline.
--
-- PROBLEMA: si un insert llega al servidor pero se pierde la respuesta, la cola
-- offline lo reintenta y el registro queda duplicado.
-- SOLUCION: el cliente genera un uuid (client_id) por registro y lo envía en el
-- insert. Un índice único parcial rechaza el reintento con 23505 y la app lo
-- trata como éxito (busca la fila existente por client_id).
--
-- Seguro sobre datos existentes:
--  * La columna es NULLABLE y sin default: las filas actuales y los builds
--    viejos (que no envían client_id) siguen funcionando igual.
--  * El índice es PARCIAL (solo filas con client_id), así los NULL nunca chocan.
--  * No toca RLS ni políticas.
--
-- Ejecutar UNA VEZ en Supabase SQL Editor. Es idempotente (IF NOT EXISTS).
-- Orden: 1) correr este SQL  2) publicar el build nuevo de la app.
-- (Si el build nuevo sale antes, los inserts con client_id fallarán por columna inexistente.)

ALTER TABLE public.conductor_gastos   ADD COLUMN IF NOT EXISTS client_id uuid;
ALTER TABLE public.conductor_ingresos ADD COLUMN IF NOT EXISTS client_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS conductor_gastos_client_id_uniq
  ON public.conductor_gastos (conductor_id, client_id)
  WHERE client_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS conductor_ingresos_client_id_uniq
  ON public.conductor_ingresos (conductor_id, client_id)
  WHERE client_id IS NOT NULL;

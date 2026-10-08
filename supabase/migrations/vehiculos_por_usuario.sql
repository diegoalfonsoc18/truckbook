-- Vehículos por usuario: la misma placa puede existir para varios conductores
-- y ninguno ve ni edita la fila (tipo_camion) del otro.
--
-- ANTES: vehiculos tenía UNIQUE(placa) y todas las tablas apuntaban a esa placa,
--        así que dos usuarios con la misma placa compartían (y podían pisar) la fila.
-- AHORA: vehiculos es única por (placa, conductor_id) y gastos, ingresos y
--        vehiculo_conductores apuntan a esa pareja.
--
-- Ejecutar UNA VEZ en Supabase SQL Editor. Corre en una transacción: si algo
-- falla no queda nada a medias. Haz un backup antes (Dashboard → Database →
-- Backups) por ser un cambio de llaves.
--
-- Compatibilidad: conductor_id lleva DEFAULT auth.uid(), así que los builds
-- anteriores de la app (que insertan {placa, tipo_camion} sin conductor_id)
-- siguen funcionando sin cambios.
--
-- Columnas de vehiculos: id, placa, tipo_camion, created_at, color. La foto vive
-- en vehiculo_conductores.foto_path (ver foto_vehiculo.sql). Si tiene otras
-- columnas, agrégalas en el INSERT del paso 5.

BEGIN;

-- 1. Quitar las llaves foráneas que dependen de UNIQUE(placa)
ALTER TABLE conductor_gastos
  DROP CONSTRAINT IF EXISTS conductor_gastos_placa_fkey,
  DROP CONSTRAINT IF EXISTS fk_gastos_placa;
ALTER TABLE conductor_ingresos
  DROP CONSTRAINT IF EXISTS conductor_ingresos_placa_fkey,
  DROP CONSTRAINT IF EXISTS fk_ingresos_placa;
ALTER TABLE vehiculo_conductores
  DROP CONSTRAINT IF EXISTS vehiculo_conductores_vehiculo_placa_fkey,
  DROP CONSTRAINT IF EXISTS fk_vc_placa;

-- 2. Quitar la unicidad global de placa
ALTER TABLE vehiculos
  DROP CONSTRAINT IF EXISTS vehiculos_placa_key,
  DROP CONSTRAINT IF EXISTS vehiculos_placa_unique;

-- 3. Dueño de la fila
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS conductor_id uuid;

-- 4. Quién usa cada placa hoy (vínculos + lo que ya registró en gastos/ingresos)
CREATE TEMP TABLE _owners ON COMMIT DROP AS
  SELECT vehiculo_placa AS placa, conductor_id FROM vehiculo_conductores
  UNION SELECT placa, conductor_id FROM conductor_gastos
  UNION SELECT placa, conductor_id FROM conductor_ingresos;
DELETE FROM _owners WHERE placa IS NULL OR conductor_id IS NULL;

-- 5. Una fila por (placa, conductor), copiando el tipo de camion existente
INSERT INTO vehiculos (placa, tipo_camion, color, conductor_id)
SELECT o.placa, v.tipo_camion, v.color, o.conductor_id
FROM _owners o
JOIN vehiculos v ON v.placa = o.placa AND v.conductor_id IS NULL;

-- 6. Quitar las filas compartidas originales (las FK ya no existen: sin cascada)
DELETE FROM vehiculos WHERE conductor_id IS NULL;

ALTER TABLE vehiculos
  ALTER COLUMN conductor_id SET NOT NULL,
  ALTER COLUMN conductor_id SET DEFAULT auth.uid();

ALTER TABLE vehiculos
  ADD CONSTRAINT vehiculos_placa_conductor_key UNIQUE (placa, conductor_id);

-- 7. Llaves foráneas compuestas. fk_vc_placa conserva el nombre porque el
--    cliente lo usa como pista en el join (VehiculosListStore).
ALTER TABLE vehiculo_conductores
  ADD CONSTRAINT fk_vc_placa
  FOREIGN KEY (vehiculo_placa, conductor_id)
  REFERENCES vehiculos (placa, conductor_id) ON DELETE CASCADE;

ALTER TABLE conductor_gastos
  ADD CONSTRAINT fk_gastos_placa
  FOREIGN KEY (placa, conductor_id)
  REFERENCES vehiculos (placa, conductor_id) ON DELETE CASCADE;

ALTER TABLE conductor_ingresos
  ADD CONSTRAINT fk_ingresos_placa
  FOREIGN KEY (placa, conductor_id)
  REFERENCES vehiculos (placa, conductor_id) ON DELETE CASCADE;

-- 8. RLS: cada quien solo ve y edita sus propias filas
DROP POLICY IF EXISTS "vehiculos_select_vinculado" ON vehiculos;
DROP POLICY IF EXISTS "vehiculos_insert_auth" ON vehiculos;
DROP POLICY IF EXISTS "vehiculos_update_vinculado" ON vehiculos;
DROP POLICY IF EXISTS "vehiculos_select_own" ON vehiculos;
DROP POLICY IF EXISTS "vehiculos_insert_own" ON vehiculos;
DROP POLICY IF EXISTS "vehiculos_update_own" ON vehiculos;

CREATE POLICY "vehiculos_select_own" ON vehiculos
  FOR SELECT USING ((SELECT auth.uid()) = conductor_id);

CREATE POLICY "vehiculos_insert_own" ON vehiculos
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = conductor_id);

CREATE POLICY "vehiculos_update_own" ON vehiculos
  FOR UPDATE USING ((SELECT auth.uid()) = conductor_id)
  WITH CHECK ((SELECT auth.uid()) = conductor_id);

CREATE INDEX IF NOT EXISTS idx_vehiculos_conductor ON vehiculos (conductor_id);

COMMIT;

ANALYZE vehiculos;

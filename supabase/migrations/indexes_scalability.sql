-- Índices de escalabilidad para TruckBook
-- Ejecutar en Supabase SQL Editor (Dashboard → SQL Editor)

-- ─── vehiculo_conductores ─────────────────────────────────────────────────────
-- Tabla = relación pura usuario↔placa (columnas: id, vehiculo_placa, conductor_id, created_at).
-- Las políticas RLS hacen subquery por (vehiculo_placa, conductor_id); este índice lo cubre.
CREATE INDEX IF NOT EXISTS idx_vc_placa_conductor
  ON vehiculo_conductores (vehiculo_placa, conductor_id);

-- Para búsquedas por conductor_id solo (DataProvider realtime filter)
CREATE INDEX IF NOT EXISTS idx_vc_conductor_id
  ON vehiculo_conductores (conductor_id);

-- ─── conductor_gastos ─────────────────────────────────────────────────────────
-- Queries siempre filtran por placa + conductor_id y ordenan por created_at
CREATE INDEX IF NOT EXISTS idx_gastos_placa_conductor_fecha
  ON conductor_gastos (placa, conductor_id, created_at DESC);

-- Para soft delete futuro y filtros por estado
CREATE INDEX IF NOT EXISTS idx_gastos_conductor_estado
  ON conductor_gastos (conductor_id, estado);

-- ─── conductor_ingresos ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ingresos_placa_conductor_fecha
  ON conductor_ingresos (placa, conductor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ingresos_conductor_estado
  ON conductor_ingresos (conductor_id, estado);

-- ─── usuarios ─────────────────────────────────────────────────────────────────
-- Filtrar cuentas activas (soft delete)
CREATE INDEX IF NOT EXISTS idx_usuarios_active
  ON usuarios (user_id) WHERE deleted = false;

-- (usuarios.user_id ya tiene constraint único — lo usa onConflict en la app —
--  por lo que ya está indexado; no se agrega índice extra.)

-- ─── Refrescar estadísticas para que el planificador use los índices ──────────
ANALYZE usuarios;
ANALYZE vehiculos;
ANALYZE vehiculo_conductores;
ANALYZE conductor_gastos;
ANALYZE conductor_ingresos;

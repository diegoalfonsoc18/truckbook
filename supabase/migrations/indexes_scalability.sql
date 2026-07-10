-- Índices de escalabilidad para TruckBook
-- Ejecutar en Supabase SQL Editor (Dashboard → SQL Editor)
--
-- Revisión 2026-07-09: mapeo índice ↔ query verificado contra todos los
-- accesos del cliente (src/). Cada índice de abajo tiene al menos un query
-- que lo usa; no hay queries sin índice que los cubra.

-- ─── vehiculo_conductores ─────────────────────────────────────────────────────
-- Tabla = relación pura usuario↔placa (columnas: id, vehiculo_placa, conductor_id, created_at).
-- Cubre: RLS de vehiculos (EXISTS por vehiculo_placa+conductor_id),
--        ModalVehiculos (conteo por vehiculo_placa),
--        VehiculoStore.validarPlacaParaUsuario (conductor_id+vehiculo_placa).
CREATE INDEX IF NOT EXISTS idx_vc_placa_conductor
  ON vehiculo_conductores (vehiculo_placa, conductor_id);

-- Cubre: VehiculosListStore (lista por conductor_id + join a vehiculos),
--        realtime filter conductor_id=eq.X, políticas RLS *_own.
CREATE INDEX IF NOT EXISTS idx_vc_conductor_id
  ON vehiculo_conductores (conductor_id);

-- ─── conductor_gastos ─────────────────────────────────────────────────────────
-- Cubre: DataProvider (placa+conductor_id ORDER BY created_at DESC LIMIT 200)
--        y el reset de datos de Cuenta (DELETE por placa+conductor_id).
CREATE INDEX IF NOT EXISTS idx_gastos_placa_conductor_fecha
  ON conductor_gastos (placa, conductor_id, created_at DESC);

-- Columna líder conductor_id: cubre el chequeo RLS (SELECT auth.uid()) =
-- conductor_id en mutaciones por id y el filtro realtime conductor_id=eq.X.
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

-- ─── FUTURO (no ejecutar aún) ─────────────────────────────────────────────────
-- Hoy los reportes filtran por rango de fechas EN EL CLIENTE sobre el caché
-- del DataProvider (máx. 200 filas). Si Reportes pasa a consultar rangos de
-- fecha server-side (necesario para historiales >200 registros), crear:
-- CREATE INDEX IF NOT EXISTS idx_gastos_conductor_placa_fecha
--   ON conductor_gastos (conductor_id, placa, fecha DESC);
-- CREATE INDEX IF NOT EXISTS idx_ingresos_conductor_placa_fecha
--   ON conductor_ingresos (conductor_id, placa, fecha DESC);

-- ─── Refrescar estadísticas para que el planificador use los índices ──────────
ANALYZE usuarios;
ANALYZE vehiculos;
ANALYZE vehiculo_conductores;
ANALYZE conductor_gastos;
ANALYZE conductor_ingresos;

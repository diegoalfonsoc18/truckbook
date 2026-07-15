-- ============================================================
-- RLS Policies para TruckBook — LIMPIEZA + CREACIÓN
-- Ejecutar en Supabase SQL Editor (Dashboard → SQL Editor)
-- ⚠️  Elimina TODAS las políticas existentes y crea las correctas
-- ============================================================

-- ============================================================
-- PASO 1: ELIMINAR TODAS LAS POLÍTICAS EXISTENTES
-- ============================================================

-- conductor_gastos
DROP POLICY IF EXISTS "gastos_delete_own" ON conductor_gastos;
DROP POLICY IF EXISTS "gastos_update_own" ON conductor_gastos;
DROP POLICY IF EXISTS "delete_gastos" ON conductor_gastos;
DROP POLICY IF EXISTS "gastos_insert" ON conductor_gastos;
DROP POLICY IF EXISTS "select_gastos" ON conductor_gastos;
DROP POLICY IF EXISTS "gastos_insert_own" ON conductor_gastos;
DROP POLICY IF EXISTS "gastos_select_own" ON conductor_gastos;
DROP POLICY IF EXISTS "gastos_update" ON conductor_gastos;
DROP POLICY IF EXISTS "gastos_delete" ON conductor_gastos;
DROP POLICY IF EXISTS "gastos_select" ON conductor_gastos;
DROP POLICY IF EXISTS "gastos: ver propios" ON conductor_gastos;
DROP POLICY IF EXISTS "gastos: actualizar propios" ON conductor_gastos;
DROP POLICY IF EXISTS "gastos: eliminar propios" ON conductor_gastos;
DROP POLICY IF EXISTS "gastos: insertar propios" ON conductor_gastos;
DROP POLICY IF EXISTS "insert_gastos" ON conductor_gastos;
DROP POLICY IF EXISTS "update_gastos" ON conductor_gastos;

-- conductor_ingresos
DROP POLICY IF EXISTS "ingresos: actualizar propios" ON conductor_ingresos;
DROP POLICY IF EXISTS "ingresos_select" ON conductor_ingresos;
DROP POLICY IF EXISTS "select_ingresos" ON conductor_ingresos;
DROP POLICY IF EXISTS "insert_ingresos" ON conductor_ingresos;
DROP POLICY IF EXISTS "update_ingresos" ON conductor_ingresos;
DROP POLICY IF EXISTS "delete_ingresos" ON conductor_ingresos;
DROP POLICY IF EXISTS "ingresos_insert_own" ON conductor_ingresos;
DROP POLICY IF EXISTS "ingresos_select_own" ON conductor_ingresos;
DROP POLICY IF EXISTS "ingresos_delete_own" ON conductor_ingresos;
DROP POLICY IF EXISTS "ingresos_update_own" ON conductor_ingresos;
DROP POLICY IF EXISTS "ingresos_delete" ON conductor_ingresos;
DROP POLICY IF EXISTS "ingresos_update" ON conductor_ingresos;
DROP POLICY IF EXISTS "ingresos_insert" ON conductor_ingresos;
DROP POLICY IF EXISTS "ingresos: ver propios" ON conductor_ingresos;
DROP POLICY IF EXISTS "ingresos: insertar propios" ON conductor_ingresos;
DROP POLICY IF EXISTS "ingresos: eliminar propios" ON conductor_ingresos;

-- usuarios
DROP POLICY IF EXISTS "select_own" ON usuarios;
DROP POLICY IF EXISTS "insert_own" ON usuarios;
DROP POLICY IF EXISTS "update_own" ON usuarios;
DROP POLICY IF EXISTS "read_all_profiles" ON usuarios;
DROP POLICY IF EXISTS "usuarios: ver propio" ON usuarios;
DROP POLICY IF EXISTS "usuarios: editar propio" ON usuarios;
DROP POLICY IF EXISTS "usuarios_select" ON usuarios;
DROP POLICY IF EXISTS "usuarios_update" ON usuarios;
DROP POLICY IF EXISTS "usuarios_insert" ON usuarios;
DROP POLICY IF EXISTS "usuarios_select_own" ON usuarios;
-- ⚠️ Política insegura: permitía a CUALQUIER autenticado leer TODOS los perfiles.
DROP POLICY IF EXISTS "usuarios_select_auth" ON usuarios;
DROP POLICY IF EXISTS "usuarios_insert_own" ON usuarios;
DROP POLICY IF EXISTS "usuarios_update_own" ON usuarios;

-- vehiculo_conductores
DROP POLICY IF EXISTS "vc_update" ON vehiculo_conductores;
DROP POLICY IF EXISTS "vc_delete_own" ON vehiculo_conductores;
DROP POLICY IF EXISTS "vc: eliminar propia" ON vehiculo_conductores;
DROP POLICY IF EXISTS "vc: actualizar propia" ON vehiculo_conductores;
DROP POLICY IF EXISTS "vc: insertar propia" ON vehiculo_conductores;
DROP POLICY IF EXISTS "vc_select" ON vehiculo_conductores;
DROP POLICY IF EXISTS "vc_insert" ON vehiculo_conductores;
DROP POLICY IF EXISTS "vc_delete" ON vehiculo_conductores;
DROP POLICY IF EXISTS "vc_select_own" ON vehiculo_conductores;
DROP POLICY IF EXISTS "vc: ver propias" ON vehiculo_conductores;
DROP POLICY IF EXISTS "delete_vc" ON vehiculo_conductores;
DROP POLICY IF EXISTS "update_vc" ON vehiculo_conductores;
DROP POLICY IF EXISTS "insert_vc" ON vehiculo_conductores;
DROP POLICY IF EXISTS "select_vc" ON vehiculo_conductores;
DROP POLICY IF EXISTS "vc_insert_own" ON vehiculo_conductores;
DROP POLICY IF EXISTS "vc_update_own" ON vehiculo_conductores;
DROP POLICY IF EXISTS "vc_update_propietario" ON vehiculo_conductores;
DROP POLICY IF EXISTS "vc_update_allowed" ON vehiculo_conductores;

-- vehiculos
DROP POLICY IF EXISTS "vehiculos_select" ON vehiculos;
DROP POLICY IF EXISTS "vehiculos_insert" ON vehiculos;
DROP POLICY IF EXISTS "vehiculos_select_auth" ON vehiculos;
DROP POLICY IF EXISTS "vehiculos_insert_auth" ON vehiculos;
DROP POLICY IF EXISTS "insert_vehiculos" ON vehiculos;
DROP POLICY IF EXISTS "select_vehiculos" ON vehiculos;
DROP POLICY IF EXISTS "vehiculos: ver si relacionado" ON vehiculos;
DROP POLICY IF EXISTS "vehiculos_select_authorized" ON vehiculos;
DROP POLICY IF EXISTS "vehiculos_insert_own" ON vehiculos;
DROP POLICY IF EXISTS "vehiculos_update_own" ON vehiculos;
DROP POLICY IF EXISTS "vehiculos_select_vinculado" ON vehiculos;
DROP POLICY IF EXISTS "vehiculos_update_vinculado" ON vehiculos;
DROP POLICY IF EXISTS "vehiculos_update_propietario" ON vehiculos;

-- ============================================================
-- PASO 2: ASEGURAR QUE RLS ESTÁ ACTIVO
-- ============================================================
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculo_conductores ENABLE ROW LEVEL SECURITY;
ALTER TABLE conductor_gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE conductor_ingresos ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PASO 3: CREAR POLÍTICAS SEGURAS
-- ============================================================
-- ⚡ Rendimiento a escala: auth.uid() está envuelto en (SELECT auth.uid()).
--    Postgres lo evalúa como InitPlan UNA vez por query en vez de una vez por
--    fila. Es la optimización de RLS #1 documentada por Supabase para miles
--    de filas/usuarios. NO quitar el SELECT.
--    Ref: supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ────────────────────────────────────────────────────────────
-- USUARIOS — solo tu propio perfil
-- ────────────────────────────────────────────────────────────
CREATE POLICY "usuarios_select_own" ON usuarios
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "usuarios_insert_own" ON usuarios
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "usuarios_update_own" ON usuarios
  FOR UPDATE USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ────────────────────────────────────────────────────────────
-- VEHICULOS — solo vehículos a los que estás vinculado
-- ────────────────────────────────────────────────────────────
CREATE POLICY "vehiculos_select_vinculado" ON vehiculos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM vehiculo_conductores vc
      WHERE vc.vehiculo_placa = vehiculos.placa
        AND vc.conductor_id = (SELECT auth.uid())
    )
  );

-- Cualquier autenticado puede registrar un vehículo nuevo.
-- OJO (2026-07-13): el cliente debe usar INSERT plano, NUNCA upsert/ON CONFLICT
-- sobre vehiculos — con RLS, ON CONFLICT exige pasar también la política de
-- UPDATE (estar vinculado), lo que bloquea el registro de placas nuevas (42501).
CREATE POLICY "vehiculos_insert_auth" ON vehiculos
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- Un usuario vinculado al vehículo puede editarlo.
-- (Sin sistema de roles: vehiculo_conductores es una relación pura usuario↔placa.)
CREATE POLICY "vehiculos_update_vinculado" ON vehiculos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM vehiculo_conductores vc
      WHERE vc.vehiculo_placa = vehiculos.placa
        AND vc.conductor_id = (SELECT auth.uid())
    )
  );

-- ────────────────────────────────────────────────────────────
-- VEHICULO_CONDUCTORES — relación pura: cada quien gestiona solo la suya
-- ────────────────────────────────────────────────────────────
CREATE POLICY "vc_select_own" ON vehiculo_conductores
  FOR SELECT USING ((SELECT auth.uid()) = conductor_id);

CREATE POLICY "vc_insert_own" ON vehiculo_conductores
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = conductor_id);

CREATE POLICY "vc_update_own" ON vehiculo_conductores
  FOR UPDATE USING ((SELECT auth.uid()) = conductor_id)
  WITH CHECK ((SELECT auth.uid()) = conductor_id);

CREATE POLICY "vc_delete_own" ON vehiculo_conductores
  FOR DELETE USING ((SELECT auth.uid()) = conductor_id);

-- ────────────────────────────────────────────────────────────
-- CONDUCTOR_GASTOS — tus gastos + propietario ve gastos de su vehículo
-- ────────────────────────────────────────────────────────────
-- Aislamiento estricto: cada usuario ve únicamente sus propios gastos.
-- (El sistema de roles fue eliminado — ya no hay "propietario ve todo".)
CREATE POLICY "gastos_select_own" ON conductor_gastos
  FOR SELECT USING ((SELECT auth.uid()) = conductor_id);

CREATE POLICY "gastos_insert_own" ON conductor_gastos
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = conductor_id);

CREATE POLICY "gastos_update_own" ON conductor_gastos
  FOR UPDATE USING ((SELECT auth.uid()) = conductor_id)
  WITH CHECK ((SELECT auth.uid()) = conductor_id);

CREATE POLICY "gastos_delete_own" ON conductor_gastos
  FOR DELETE USING ((SELECT auth.uid()) = conductor_id);

-- ────────────────────────────────────────────────────────────
-- CONDUCTOR_INGRESOS — tus ingresos + propietario ve ingresos de su vehículo
-- ────────────────────────────────────────────────────────────
-- Aislamiento estricto: cada usuario ve únicamente sus propios ingresos.
CREATE POLICY "ingresos_select_own" ON conductor_ingresos
  FOR SELECT USING ((SELECT auth.uid()) = conductor_id);

CREATE POLICY "ingresos_insert_own" ON conductor_ingresos
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = conductor_id);

CREATE POLICY "ingresos_update_own" ON conductor_ingresos
  FOR UPDATE USING ((SELECT auth.uid()) = conductor_id)
  WITH CHECK ((SELECT auth.uid()) = conductor_id);

CREATE POLICY "ingresos_delete_own" ON conductor_ingresos
  FOR DELETE USING ((SELECT auth.uid()) = conductor_id);

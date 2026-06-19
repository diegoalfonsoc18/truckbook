-- Soft delete + anonimización irreversible en tabla usuarios
-- Ejecutar en Supabase SQL Editor

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS deleted      boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at   timestamptz;

-- Índice para filtrar cuentas activas eficientemente
CREATE INDEX IF NOT EXISTS idx_usuarios_deleted ON usuarios (deleted) WHERE deleted = false;

-- Política: un usuario eliminado no puede leer ni editar su propio perfil
-- (Las políticas existentes que usen auth.uid() = user_id ya cubren esto
--  porque el usuario hace signOut inmediatamente; esta capa es defensa extra)

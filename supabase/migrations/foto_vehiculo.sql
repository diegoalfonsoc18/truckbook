-- Foto del camión subida por el usuario
-- Ejecutar en Supabase SQL Editor (Dashboard → SQL Editor)
--
-- La foto se recorta EN EL DISPOSITIVO (Vision en iOS, ML Kit en Android) y
-- llega aquí como PNG con transparencia. No pasa por ningún servicio de IA
-- externo: la placa del vehículo es un dato personal y no tiene por qué salir
-- del teléfono más que para guardarse en este bucket.

-- ─── Columna ─────────────────────────────────────────────────────────────────
-- Va en vehiculo_conductores y NO en vehiculos a propósito: `vehiculos` es
-- compartida por placa, así que si dos conductores usan el mismo camión la
-- foto de uno le pisaría la del otro. Aquí cada quien tiene la suya.
ALTER TABLE vehiculo_conductores
  ADD COLUMN IF NOT EXISTS foto_path text;

-- Se guarda el PATH dentro del bucket, no una URL: el bucket es privado y las
-- URLs firmadas caducan, así que una URL guardada quedaría rota en horas.

-- ─── Bucket ──────────────────────────────────────────────────────────────────
-- Privado: la foto muestra la placa del camión.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehiculos-fotos',
  'vehiculos-fotos',
  false,
  3145728,                      -- 3 MB: de sobra para un PNG de 1000x600
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET file_size_limit   = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types,
      public            = false;

-- ─── Políticas del bucket ────────────────────────────────────────────────────
-- Storage NO hereda las RLS de las tablas: hay que escribirlas aparte sobre
-- storage.objects. El aislamiento se hace por la primera carpeta de la ruta,
-- que es el user_id: `{user_id}/{placa}.png`.
DROP POLICY IF EXISTS "fotos_vehiculo_select_own" ON storage.objects;
DROP POLICY IF EXISTS "fotos_vehiculo_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "fotos_vehiculo_update_own" ON storage.objects;
DROP POLICY IF EXISTS "fotos_vehiculo_delete_own" ON storage.objects;

CREATE POLICY "fotos_vehiculo_select_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'vehiculos-fotos'
    AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "fotos_vehiculo_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'vehiculos-fotos'
    AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "fotos_vehiculo_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'vehiculos-fotos'
    AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'vehiculos-fotos'
    AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "fotos_vehiculo_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'vehiculos-fotos'
    AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

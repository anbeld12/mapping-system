-- Migración para añadir soporte a Barrios (Neighborhoods)

-- 1. Crear extensión uuid-ossp si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Crear tabla de barrios
CREATE TABLE IF NOT EXISTS neighborhoods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    geom GEOMETRY(POLYGON, 4326),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    synced_at TIMESTAMPTZ,
    created_by VARCHAR(255)
);

-- 3. Índices para barrios
CREATE INDEX IF NOT EXISTS idx_neighborhoods_geom ON neighborhoods USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_synced_at ON neighborhoods (synced_at);

-- 4. Modificar tabla blocks para referenciar barrios
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='blocks' AND column_name='neighborhood_id') THEN
        ALTER TABLE blocks ADD COLUMN neighborhood_id UUID REFERENCES neighborhoods(id) ON DELETE SET NULL;
        CREATE INDEX idx_blocks_neighborhood_id ON blocks (neighborhood_id);
    END IF;
END $$;

COMMENT ON TABLE neighborhoods IS 'Almacena la delimitación geográfica y metadatos de los barrios.';
COMMENT ON COLUMN blocks.neighborhood_id IS 'Referencia al barrio al que pertenece la cuadra.';

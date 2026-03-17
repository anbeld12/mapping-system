-- Migration: Create predios table and tipo_predio enum
-- SRID: 4326 (WGS84)

-- Create ENUM for property type
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_predio') THEN
        CREATE TYPE tipo_predio AS ENUM ('FRONTAL', 'ANCHO');
    END IF;
END $$;

-- Table: predios
CREATE TABLE IF NOT EXISTS predios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    tipo tipo_predio NOT NULL,
    geom GEOMETRY(LINESTRING, 4326) NOT NULL,
    numero_casa VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_predios_geom ON predios USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_predios_block_id ON predios (block_id);

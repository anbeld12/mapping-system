-- ==========================================
-- Esquema de Base de Datos - Mapping System
-- SRID: 4326 (WGS84)
-- ==========================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Tabla: blocks
CREATE TABLE IF NOT EXISTS blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    geom GEOMETRY(POLYGON, 4326) NOT NULL,
    division_points JSONB,
    capture_method VARCHAR(50) DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    synced_at TIMESTAMPTZ,
    created_by VARCHAR(255)
);

-- Tabla: houses
CREATE TABLE IF NOT EXISTS houses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    geom GEOMETRY(POLYGON, 4326) NOT NULL,
    house_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    synced_at TIMESTAMPTZ
);

-- Tabla: pending_changes
CREATE TABLE IF NOT EXISTS pending_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    operation VARCHAR(10) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    synced BOOLEAN DEFAULT false
);

-- Índices Espaciales y Relacionales
CREATE INDEX IF NOT EXISTS idx_blocks_geom ON blocks USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_houses_geom ON houses USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_houses_block_id ON houses (block_id);
CREATE INDEX IF NOT EXISTS idx_blocks_synced_at ON blocks (synced_at);
CREATE INDEX IF NOT EXISTS idx_houses_synced_at ON houses (synced_at);
CREATE INDEX IF NOT EXISTS idx_pending_changes_synced ON pending_changes (synced);

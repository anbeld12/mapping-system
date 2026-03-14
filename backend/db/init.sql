-- ==========================================
-- Script de Inicialización de Base de Datos
-- Proyecto: Sistema de Mapeo Geoespacial (Acueducto de Bogotá)
-- ==========================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Limpiar esquema existente (Empieza desde cero)
DROP TABLE IF EXISTS houses CASCADE;
DROP TABLE IF EXISTS blocks CASCADE;
DROP TABLE IF EXISTS neighborhoods CASCADE;
DROP TABLE IF EXISTS pending_changes CASCADE;

-- ==========================================
-- Tabla: neighborhoods
-- Almacena la delimitación geográfica y metadatos de los barrios
-- ==========================================
CREATE TABLE neighborhoods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    geom GEOMETRY(POLYGON, 4326),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    synced_at TIMESTAMPTZ,
    created_by VARCHAR(255)
);

COMMENT ON TABLE neighborhoods IS 'Almacena la delimitación geográfica y metadatos de los barrios.';

-- Índices para neighborhoods
CREATE INDEX idx_neighborhoods_geom ON neighborhoods USING GIST (geom);
CREATE INDEX idx_neighborhoods_synced_at ON neighborhoods (synced_at);

-- ==========================================
-- Tabla: blocks
-- Almacena las cuadras registradas
-- ==========================================
CREATE TABLE blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    geom GEOMETRY(POLYGON, 4326) NOT NULL,
    division_points JSONB, -- Array de puntos [lng, lat] en orden
    capture_method VARCHAR(50) DEFAULT 'manual', -- manual, gps, existing
    neighborhood_id UUID REFERENCES neighborhoods(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    synced_at TIMESTAMPTZ,
    created_by VARCHAR(255),
    CONSTRAINT valid_geom CHECK (ST_IsValid(geom))
);

COMMENT ON TABLE blocks IS 'Almacena las cuadras con su geometría poligonal y puntos de división.';
COMMENT ON COLUMN blocks.division_points IS 'Puntos de marca sobre el frente de la cuadra en formato JSONB.';
COMMENT ON COLUMN blocks.synced_at IS 'Marca de tiempo de la última sincronización con el servidor.';
COMMENT ON COLUMN blocks.neighborhood_id IS 'Referencia al barrio al que pertenece la cuadra.';

-- Índices para blocks
CREATE INDEX idx_blocks_geom ON blocks USING GIST (geom);
CREATE INDEX idx_blocks_synced_at ON blocks (synced_at);
CREATE INDEX idx_blocks_neighborhood_id ON blocks (neighborhood_id);

-- ==========================================
-- Tabla: houses
-- Almacena las viviendas dentro de las cuadras
-- ==========================================
CREATE TABLE houses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    geom GEOMETRY(POLYGON, 4326) NOT NULL,
    house_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    synced_at TIMESTAMPTZ,
    CONSTRAINT valid_geom CHECK (ST_IsValid(geom))
);

COMMENT ON TABLE houses IS 'Almacena las viviendas asociadas a una cuadra.';
COMMENT ON COLUMN houses.block_id IS 'Referencia a la cuadra contenedora. Borrado en cascada habilitado.';

-- Índices para houses
CREATE INDEX idx_houses_geom ON houses USING GIST (geom);
CREATE INDEX idx_houses_block_id ON houses (block_id);
CREATE INDEX idx_houses_synced_at ON houses (synced_at);

-- ==========================================
-- Tabla: pending_changes
-- Soporte para sincronización offline
-- ==========================================
CREATE TABLE pending_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- 'block', 'house', 'neighborhood'
    entity_id UUID NOT NULL,
    operation VARCHAR(10) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    data JSONB NOT NULL, -- Datos completos en GeoJSON o formato interno
    created_at TIMESTAMPTZ DEFAULT now(),
    synced BOOLEAN DEFAULT false
);

COMMENT ON TABLE pending_changes IS 'Almacena operaciones pendientes realizadas en modo offline.';
CREATE INDEX idx_pending_changes_synced ON pending_changes (synced);

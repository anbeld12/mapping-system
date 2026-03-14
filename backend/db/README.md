# Base de datos — Mapping System

PostgreSQL con PostGIS para almacenamiento y operaciones geoespaciales.

## Requisitos previos

1. PostgreSQL 14+
2. Extensión PostGIS instalada en el sistema:
   ```bash
   # Ubuntu / Debian
   sudo apt install postgresql-14-postgis-3
   # macOS (Homebrew)
   brew install postgis
   ```

## Inicialización

```bash
# 1. Crear la base de datos
psql -U postgres -c "CREATE DATABASE mapping_system;"

# 2. Ejecutar el script de inicialización completo
psql -U postgres -d mapping_system -f init.sql
```

`init.sql` habilita las extensiones y crea todas las tablas e índices necesarios.

## Esquema

### `neighborhoods`
| Columna      | Tipo                   | Descripción                |
|--------------|------------------------|----------------------------|
| `id`         | UUID (PK)              | Identificador único        |
| `name`       | VARCHAR(255)           | Nombre del barrio          |
| `geom`       | GEOMETRY(POLYGON,4326) | Polígono del barrio (WGS84)|
| `created_at` | TIMESTAMPTZ            | Fecha de creación          |
| `updated_at` | TIMESTAMPTZ            | Última actualización       |
| `synced_at`  | TIMESTAMPTZ            | Fecha de última sincronía  |

### `blocks`
| Columna           | Tipo                   | Descripción                             |
|-------------------|------------------------|-----------------------------------------|
| `id`              | UUID (PK)              | Identificador único                     |
| `name`            | VARCHAR(255)           | Nombre descriptivo                      |
| `geom`            | GEOMETRY(POLYGON,4326) | Polígono de la cuadra (WGS84)          |
| `division_points` | JSONB                  | Puntos de subdivisión en el frente     |
| `capture_method`  | VARCHAR(50)            | `gps` o `manual`                       |
| `neighborhood_id` | UUID (FK → neighborhoods) | Barrio al que pertenece             |
| `created_at`      | TIMESTAMPTZ            | Fecha de creación                       |
| `updated_at`      | TIMESTAMPTZ            | Última actualización                    |
| `synced_at`       | TIMESTAMPTZ            | Fecha de última sincronía               |

### `houses`
| Columna       | Tipo                   | Descripción                        |
|---------------|------------------------|------------------------------------|
| `id`          | UUID (PK)              | Identificador único                |
| `block_id`    | UUID (FK → blocks)     | Cuadra a la que pertenece          |
| `geom`        | GEOMETRY(POLYGON,4326) | Polígono de la vivienda (WGS84)   |
| `house_number`| INTEGER                | Número de la vivienda              |
| `created_at`  | TIMESTAMPTZ            | Fecha de creación                  |
| `synced_at`   | TIMESTAMPTZ            | Fecha de última sincronía          |

### `pending_changes`
Tabla de cola de cambios offline pendientes de sincronización. Gestionada internamente por el backend.

## Índices espaciales

Se crean índices GIST en `blocks.geom` y `houses.geom` para consultas geoespaciales eficientes (p.ej. intersección con bounding box).

# Backend — Mapping System

API REST con Node.js + Express + PostgreSQL/PostGIS.

## Requisitos

- Node.js v18+
- PostgreSQL 14+ con PostGIS habilitado

## Instalación

```bash
npm install
```

## Variables de entorno

Copiar `.env.example` a `.env` y ajustar los valores:

| Variable      | Descripción                                     | Ejemplo           |
|---------------|-------------------------------------------------|-------------------|
| `DB_HOST`     | Host de PostgreSQL                              | `localhost`       |
| `DB_PORT`     | Puerto de PostgreSQL                            | `5432`            |
| `DB_USER`     | Usuario de la base de datos                     | `postgres`        |
| `DB_PASSWORD` | Contraseña de la base de datos                  | `secret`          |
| `DB_NAME`     | Nombre de la base de datos                      | `mapping_system`  |
| `PORT`        | Puerto donde escucha la API                     | `3000`            |
| `CORS_ORIGIN` | Orígenes permitidos, separados por coma         | `http://localhost:5173,https://app.example.com` |

> **Nota:** Si `CORS_ORIGIN` no está definido, se permite `*` (todos los orígenes). En producción **siempre** defina esta variable.

## Inicializar la base de datos

```bash
# Crear la base de datos
psql -U postgres -c "CREATE DATABASE mapping_system;"

# Ejecutar el script principal (incluye schema + datos iniciales)
psql -U postgres -d mapping_system -f db/init.sql
```

Ver [db/README.md](db/README.md) para más detalles sobre el esquema.

## Ejecutar el servidor

```bash
npm start        # Producción
npm run dev      # Desarrollo (con nodemon, si está configurado)
```

## Endpoints principales

| Método | Ruta                        | Descripción                          |
|--------|-----------------------------|--------------------------------------|
| GET    | `/api/map`                  | Datos del mapa (bloques, casas, barrios) |
| GET    | `/api/blocks`               | Listar bloques                       |
| POST   | `/api/blocks`               | Crear bloque y generar casas         |
| GET    | `/api/houses`               | Listar casas (con filtro bbox)       |
| POST   | `/api/houses/generate`      | Generar casas por cantidad           |
| POST   | `/api/houses/generate-by-width` | Generar casas por ancho de lote  |
| GET    | `/api/neighborhoods`        | Listar barrios                       |
| POST   | `/api/neighborhoods`        | Crear barrio                         |
| PUT    | `/api/neighborhoods/:id`    | Actualizar barrio                    |
| DELETE | `/api/neighborhoods/:id`    | Eliminar barrio                      |
| POST   | `/api/sync`                 | Sincronizar cambios offline          |
| GET    | `/api/export/:format`       | Exportar datos (geojson, shp, csv)   |

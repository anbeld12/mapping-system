# Sistema de Mapeo Geoespacial de Viviendas 🗺️

Sistema para el mapeo, gestión y exportación de cuadras, viviendas y barrios del acueducto de Bogotá. Soporta captura GPS, edición offline y sincronización con el servidor.

## Requisitos

- **Node.js** v18+
- **PostgreSQL** 14+ con extensión **PostGIS**
- **npm** (incluido con Node.js)

## Inicio rápido

### 1. Backend

```bash
cd backend
cp .env.example .env          # Configurar variables de entorno
npm install
psql -U postgres -c "CREATE DATABASE mapping_system;"
psql -U postgres -d mapping_system -f db/init.sql   # o db/schema.sql si es instalación limpia
npm start
```

El servidor escucha en `http://localhost:3000` por defecto.

### 2. Frontend

```bash
cd frontend
npm install
# Crear .env con la URL de la API:
echo "VITE_API_URL=http://localhost:3000" > .env
npm run dev
```

La app estará disponible en `http://localhost:5173`.

## Documentación adicional

- [Backend →](backend/README.md)
- [Frontend →](frontend/README.md)
- [Base de datos →](backend/db/README.md)

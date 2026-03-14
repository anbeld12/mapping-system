# Frontend — Mapping System

Aplicación React con Vite, React-Leaflet y soporte offline (IndexedDB).

## Requisitos

- Node.js v18+
- Backend corriendo (ver [../backend/README.md](../backend/README.md))

## Instalación

```bash
npm install
```

## Variables de entorno

Crear un archivo `.env` en la raíz del directorio `frontend/`:

```env
VITE_API_URL=http://localhost:3000
```

En producción reemplazar con la URL del servidor backend desplegado.

## Desarrollo

```bash
npm run dev
```

La aplicación estará en `http://localhost:5173`.

## Producción

```bash
npm run build      # Genera la carpeta dist/
npm run preview    # Previsualizar la build localmente
```

## Funcionalidades principales

- **Mapa interactivo**: visualización de cuadras, viviendas y barrios con React-Leaflet.
- **Captura GPS**: caminata con Dead Reckoning (estimación por pasos cuando el GPS es débil).
- **Modo offline**: datos guardados en IndexedDB y sincronizados automáticamente al recuperar conexión.
- **Gestión de barrios**: crear, renombrar y editar geométricamente barrios desde el panel lateral.
- **Colores por barrio**: cada barrio tiene un color distintivo generado a partir de su ID.
- **Exportar datos**: exportación en GeoJSON, CSV y reportes PDF.

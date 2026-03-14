## Paquete de Pruebas / Auditoría Final

Este folder contiene artefactos para ejecutar la auditoría final del sistema.

### Archivos
- `postman_environment.json`: ambiente con `base_url` (por defecto `http://localhost:3000`).
- `postman_collection.json`: colección de endpoints clave (map, blocks, sync, neighborhoods, export GeoJSON/CSV, CORS check).
- `test_log_template.md`: plantilla de registro de casos (IDs 1.x–8.x) con columnas de pasos, esperado, real, estado, observaciones y evidencia.
- `seed_large_dataset.sql`: script para sembrar ~500 bloques y ~2,500 casas para pruebas de rendimiento.

### Uso sugerido
1. Importa `postman_environment.json` y ajusta `base_url` según tu backend.
2. Importa `postman_collection.json` en Postman/Insomnia.
3. Duplica `test_log_template.md` a `test_log_run_<fecha>.md` y completa los resultados durante la ejecución manual.
4. Para offline: usa DevTools (Network offline) y revisa IndexedDB (`pending_changes`) antes/después de sincronizar.
5. Para rendimiento: medir tiempos de render con dataset grande (p.ej., seed de 500 bloques) y CPU/mem en caminatas largas (>100 puntos).

### Seed de dataset grande
Para poblar datos sintéticos:

```bash
PGPASSWORD=postgres psql -h localhost -U postgres -d mapping -f testing/seed_large_dataset.sql
```

Esto crea ~500 bloques y ~5 casas por bloque. Ejecuta sobre base limpia o asume que puedes mezclar con datos previos (no depende de IDs existentes).

### Notas
- La colección incluye una prueba de CORS con Origin no permitido; ajusta `CORS_ORIGIN` en backend si quieres validar bloqueo.
- Los cuerpos de ejemplo en `POST /api/blocks` y `POST /api/neighborhoods` usan polígonos pequeños cerca de Bogotá; puedes reemplazarlos con geometrías reales de prueba.
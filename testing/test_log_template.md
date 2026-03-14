## Registro de Pruebas — Mapping System

| ID | Caso | Pasos | Resultado esperado | Resultado real | Estado (✅/❌) | Observaciones | Evidencia |
|----|------|-------|---------------------|----------------|---------------|--------------|-----------|
| 1.1 | Iniciar caminata GPS | 1. Abrir app 2. Click "Iniciar caminata" 3. Caminar 20m | Puntos cada ~2m, distancia y polígono actualizados | | | | |
| 1.2 | Pausa/reanudar | 1. Iniciar 2. Pausar 3. Moverse 4. Reanudar | No puntos en pausa, retoma luego | | | | |
| 1.3 | Deshacer último punto | 1. Iniciar 2. Capturar 3. Deshacer | Se elimina punto y recalcula distancia | | | | |
| 1.4 | Modo estimación por pasos | 1. Simular GPS débil 2. Ver indicador "Estimación por pasos" | Heading/steps usados, posición coherente | | | | |
| 1.5 | Calibrar paso | 1. Flujo calibración 10m | Nuevo valor aplicado | | | | |
| 1.6 | Cierre automático (<15m) | 1. Acercar a inicio 2. Ver botón "Cerrar cuadra" | Botón aparece | | | | |
| 1.7 | Finalizar y generar casas | 1. Finalizar 2. Generar casas | Bloque y casas creadas, preview | | | | |
| 2.1 | Editar bloque (vértice) | 1. Seleccionar 2. Mover vértice 3. Guardar | Geometría actualizada, cambio pendiente | | | | |
| 2.2 | Editar casa | 1. Seleccionar casa 2. Editar 3. Guardar | Actualiza y registra pendiente | | | | |
| 2.3 | Editar barrio geom | 1. Seleccionar barrio 2. Editar 3. Guardar | Actualiza y pendiente | | | | |
| 2.4 | Geometría inválida | 1. Generar auto-intersección 2. Guardar | Bloquea o error claro | | | | |
| 2.5 | Eliminar geom | 1. Eliminar bloque/casa/barrio | Desaparece y pending DELETE | | | | |
| 3.1 | Crear barrio + color | 1. Dibujar 2. Nombrar | Aparece en panel y mapa con color | | | | |
| 3.2 | Renombrar barrio | 1. Botón 🔤 2. Guardar | Nombre actualizado panel/mapa | | | | |
| 3.3 | Editar barrio geom | 1. Botón ✏️ 2. Guardar | Geom actualizada | | | | |
| 3.4 | Eliminar barrio | 1. Eliminar | Cuadras pierden color/asignación | | | | |
| 3.5 | Asignar cuadra a barrio | 1. Crear cuadra asignando barrio | Hereda color | | | | |
| 4.1 | Offline cambios | 1. Desconectar 2. Crear/editar/eliminar | pending_changes poblado | | | | |
| 4.2 | Reconexion sync | 1. Reconectar 2. Sync | pending_changes vacío en éxito | | | | |
| 4.3 | Conflicto | 1. Edit offline mientras otro online 2. Sync | Comportamiento documentado | | | | |
| 4.4 | Volumen (100 casas) | 1. Generar muchas 2. Sync | Tiempo y éxito medidos | | | | |
| 5.1 | Export GeoJSON | 1. Llamar export geojson | Archivo válido | | | | |
| 5.2 | Export CSV | 1. Llamar export csv | Archivo válido | | | | |
| 6.1 | API map/blocks/sync | Postman casos map/blocks/sync/neigh | Respuestas 200/validaciones | | | | |
| 6.2 | Geometría inválida 400 | 1. Enviar geom inválida | Retorna 400 | | | | |
| 6.3 | CORS bloqueado | 1. Origin no permitido | Rechazo según config | | | | |
| 7.1 | Navegadores | Chrome/Firefox/Safari | Sin errores críticos | | | | |
| 7.2 | Móviles | Android/iOS | UI usable | | | | |
| 7.3 | Performance larga | Caminata >100 pts | CPU/mem aceptable | | | | |
| 7.4 | Carga 500 bloques | Medir render inicial | Tiempo registrado | | | | |
| 8.1 | Permisos denegados | Denegar geo/orientación | Manejo correcto | | | | |
| 8.2 | Interrupción app | Cambiar app/bloquear | Estado persiste | | | | |
| 8.3 | Pérdida conexión en sync | Cortar red durante sync | Reintenta o marca pendiente | | | | |
| 8.4 | Subdivisión compleja | Bloque en L/con curvas | Subdivisión correcta | | | | |

> Notas: Completar Resultado real, Observaciones y Evidencia (capturas, logs, video) durante la ejecución. Para offline, verificar IndexedDB `pending_changes` y luego sincronía con backend (PostgreSQL).
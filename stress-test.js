const axios = require('axios');

const API_URL = 'http://localhost:3000/api/sync';

// Generar una geometría compleja para una cuadra
const generateComplexPolygon = (pointsCount) => {
    const coords = [];
    const center = [-74.0817, 4.6097];
    for (let i = 0; i < pointsCount; i++) {
        const angle = (i / pointsCount) * Math.PI * 2;
        const radius = 0.001 + Math.random() * 0.0002;
        coords.push([
            center[0] + Math.cos(angle) * radius,
            center[1] + Math.sin(angle) * radius
        ]);
    }
    coords.push(coords[0]); // Cerrar
    return {
        type: 'Polygon',
        coordinates: [coords]
    };
};

// Generar un predio complejo
const generateComplexLineString = (pointsCount) => {
    const coords = [];
    const start = [-74.0817, 4.6097];
    for (let i = 0; i < pointsCount; i++) {
        coords.push([
            start[0] + (i * 0.00001),
            start[1] + (Math.sin(i) * 0.00001)
        ]);
    }
    return {
        type: 'LineString',
        coordinates: coords
    };
};

const runStressTest = async () => {
    console.log('🚀 Iniciando Prueba de Estrés: Auditoría Final');
    
    // Simular 50 predios
    const predios = [];
    for (let i = 0; i < 50; i++) {
        predios.push({
            tipo: i % 2 === 0 ? 'FRONTAL' : 'ANCHO',
            geom: generateComplexLineString(20), // 20 puntos por predio
            numero_casa: `ST-${i+1}`
        });
    }

    const payload = {
        changes: [
            {
                operation: 'INSERT',
                entity_type: 'block',
                entity_id: '550e8400-e29b-41d4-a716-446655440000',
                data: {
                    name: "CUADRA STRESS TEST SENIOR",
                    geom: generateComplexPolygon(100), // Cuadra con 100 puntos
                    division_points: [],
                    capture_method: 'gps',
                    neighborhood_id: null,
                    predios: predios
                }
            }
        ]
    };

    console.log(`📦 Payload generado: ${(JSON.stringify(payload).length / 1024).toFixed(2)} KB`);
    console.log(`🏠 Predios a enviar: ${predios.length}`);

    const startTime = Date.now();
    try {
        const response = await axios.post(API_URL, payload);
        const duration = Date.now() - startTime;
        
        console.log('\n✅ RESULTADOS:');
        console.log(`- Tiempo de respuesta: ${duration}ms`);
        console.log(`- Status: ${response.status}`);
        console.log(`- Mensaje: ${JSON.stringify(response.data.message)}`);
        
        if (response.data.results) {
            console.log(`- Registros procesados: ${response.data.results.length}`);
        }
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error('\n❌ FALLO EN LA PRUEBA:');
        console.error(`- Tiempo hasta el fallo: ${duration}ms`);
        if (error.response) {
            console.error(`- Error del servidor (${error.response.status}):`, error.response.data);
        } else {
            console.error('- Error de red/cliente:', error.message);
        }
    }
};

runStressTest();

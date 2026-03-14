const turf = require("@turf/turf");

/**
 * Algoritmo mejorado de subdivisión: Proyección al interior desde el frente.
 * @param {Object} blockPolygon - GeoJSON Polygon del bloque.
 * @param {Array} divisionPoints - Array de puntos [lng, lat] marcados en el frente.
 * @returns {Array} Array de GeoJSON Polygons (viviendas).
 */
function generateHousesFromBlock(blockPolygon, divisionPoints) {
  if (!blockPolygon || blockPolygon.type !== "Polygon") {
    throw new Error("Invalid block geometry. Expected GeoJSON Polygon.");
  }

  const polygon = turf.cleanCoords(blockPolygon);
  
  if (!divisionPoints || divisionPoints.length < 2) {
    return [polygon];
  }

  // 1. Obtener los puntos del frente proyectados sobre el perímetro
  const perimeter = turf.polygonToLine(polygon);
  
  // Proyectamos cada punto de división al perímetro para asegurar que estén EXACTAMENTE en el borde
  const projectedPoints = divisionPoints.map(p => {
    const pt = turf.point(p);
    return turf.nearestPointOnLine(perimeter, pt);
  });

  // Ordenar los puntos a lo largo de la línea del perímetro para que sean secuenciales
  // Nota: Esto asume que los puntos definen un "frente" continuo.
  
  const houses = [];

  for (let i = 0; i < projectedPoints.length - 1; i++) {
    const p1 = projectedPoints[i];
    const p2 = projectedPoints[i + 1];
    
    // 2. Calcular el ángulo del segmento frontal
    const bearing = turf.bearing(p1, p2);
    
    // 3. Crear líneas de corte laterales (perpendiculares al frente hacia el interior)
    // Usamos distancias largas para asegurar el corte total del polígono
    const extrudeDist = 0.5; // 500m
    
    const getInwardBearing = (mid, baseBearing) => {
      let b = baseBearing + 90;
      let test = turf.destination(mid, 0.001, b, { units: 'kilometers' });
      if (!turf.booleanPointInPolygon(test, polygon)) {
        b = baseBearing - 90;
      }
      return b;
    };

    const inward1 = getInwardBearing(p1, bearing);
    const inward2 = getInwardBearing(p2, bearing);

    const p1Far = turf.destination(p1, extrudeDist, inward1, { units: 'kilometers' });
    const p2Far = turf.destination(p2, extrudeDist, inward2, { units: 'kilometers' });

    // 4. Crear un polígono cortador que abarque el segmento y se extienda hacia el "fondo"
    // Formamos un trapecio/rectángulo que sale del frente hacia adentro
    const cutter = turf.polygon([[
      p1.geometry.coordinates,
      p2.geometry.coordinates,
      p2Far.geometry.coordinates,
      p1Far.geometry.coordinates,
      p1.geometry.coordinates
    ]]);

    // 5. Intersección real con el bloque para obtener la forma exacta de la vivienda
    try {
      const intersected = turf.intersect(polygon, cutter);
      
      if (intersected) {
        if (intersected.geometry.type === "Polygon") {
          houses.push(intersected.geometry);
        } else if (intersected.geometry.type === "MultiPolygon") {
          // Devolver el polígono más grande o todos si es necesario
          intersected.geometry.coordinates.forEach(coords => {
            houses.push({ type: "Polygon", coordinates: coords });
          });
        }
      }
    } catch (err) {
      console.error("Error intersecting geometry:", err);
      // Fallback: si falla el corte, ignoramos este segmento o devolvemos algo simplificado
    }
  }

  // Si por alguna razón no se generaron casas, devolver el bloque base
  return houses.length > 0 ? houses : [polygon];
}

module.exports = {
  generateHousesFromBlock
};

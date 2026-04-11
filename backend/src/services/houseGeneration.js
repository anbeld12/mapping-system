const { point, polygon, lineString } = require("@turf/helpers");
const cleanCoords = require("@turf/clean-coords").default;
const polygonToLine = require("@turf/polygon-to-line").default;
const nearestPointOnLine = require("@turf/nearest-point-on-line").default;
const bearing = require("@turf/bearing").default;
const destination = require("@turf/destination").default;
const booleanPointInPolygon = require("@turf/boolean-point-in-polygon").default;
const intersect = require("@turf/intersect").default;

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

  const polyGeom = cleanCoords(blockPolygon);
  
  if (!divisionPoints || divisionPoints.length < 2) {
    return [polyGeom];
  }

  // 1. Obtener los puntos del frente proyectados sobre el perímetro
  const perimeter = polygonToLine(polyGeom);
  
  // Proyectamos cada punto de división al perímetro para asegurar que estén EXACTAMENTE en el borde
  const projectedPoints = divisionPoints.map(p => {
    const pt = point(p);
    return nearestPointOnLine(perimeter, pt);
  });

  const houses = [];

  for (let i = 0; i < projectedPoints.length - 1; i++) {
    const p1 = projectedPoints[i];
    const p2 = projectedPoints[i + 1];
    
    // 2. Calcular el ángulo del segmento frontal
    const b = bearing(p1, p2);
    
    // 3. Crear líneas de corte laterales (perpendiculares al frente hacia el interior)
    const extrudeDist = 0.5; // 500m
    
    const getInwardBearing = (mid, baseBearing) => {
      let ang = baseBearing + 90;
      let test = destination(mid, 0.001, ang, { units: 'kilometers' });
      if (!booleanPointInPolygon(test, polyGeom)) {
        ang = baseBearing - 90;
      }
      return ang;
    };

    const inward1 = getInwardBearing(p1, b);
    const inward2 = getInwardBearing(p2, b);

    const p1Far = destination(p1, extrudeDist, inward1, { units: 'kilometers' });
    const p2Far = destination(p2, extrudeDist, inward2, { units: 'kilometers' });

    // 4. Crear un polígono cortador
    const cutter = polygon([[
      p1.geometry.coordinates,
      p2.geometry.coordinates,
      p2Far.geometry.coordinates,
      p1Far.geometry.coordinates,
      p1.geometry.coordinates
    ]]);

    // 5. Intersección real con el bloque
    try {
      const intersected = intersect(polyGeom, cutter);
      
      if (intersected) {
        if (intersected.geometry.type === "Polygon") {
          houses.push(intersected.geometry);
        } else if (intersected.geometry.type === "MultiPolygon") {
          intersected.geometry.coordinates.forEach(coords => {
            houses.push({ type: "Polygon", coordinates: coords });
          });
        }
      }
    } catch (err) {
      console.error("Error intersecting geometry:", err);
    }
  }

  return houses.length > 0 ? houses : [polyGeom];
}

module.exports = {
  generateHousesFromBlock
};

import * as turf from '@turf/turf';

export const geometryEditService = {
  /**
   * Valida un polígono GeoJSON
   */
  isValid: (geojson) => {
    try {
      if (!geojson || geojson.type !== 'Polygon') return false;
      return turf.booleanValid(geojson);
    } catch {
      return false;
    }
  },

  /**
   * Verifica si un polígono está contenido dentro de otro
   */
  isWithin: (inner, outer) => {
    try {
      return turf.booleanWithin(inner, outer);
    } catch {
      return false;
    }

  }
};

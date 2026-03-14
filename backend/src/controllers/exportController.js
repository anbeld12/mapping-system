const pool = require("../config/database");
const { Parser } = require("json2csv");
const PDFDocument = require("pdfkit");

const exportController = {
  exportData: async (req, res) => {
    const { format, bbox, neighborhood_ids, start_date, end_date, include_blocks, include_houses, include_neighborhoods } = req.query;

    try {
      let geojson = {
        type: "FeatureCollection",
        features: []
      };

      const filters = [];
      const params = [];

      if (bbox) {
        const coords = bbox.split(",").map(Number);
        filters.push(`ST_Intersects(geom, ST_MakeEnvelope($${params.length + 1}, $${params.length + 2}, $${params.length + 3}, $${params.length + 4}, 4326))`);
        params.push(...coords);
      }

      if (neighborhood_ids) {
        const ids = neighborhood_ids.split(",");
        filters.push(`neighborhood_id = ANY($${params.length + 1})`);
        params.push(ids);
      }

      if (start_date) {
        filters.push(`created_at >= $${params.length + 1}`);
        params.push(start_date);
      }

      if (end_date) {
        filters.push(`created_at <= $${params.length + 1}`);
        params.push(end_date);
      }

      const filterStr = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

      // Export Blocks
      if (include_blocks === "true" || !include_blocks) {
        const blocksRes = await pool.query(
          `SELECT id, name, ST_AsGeoJSON(geom)::jsonb as geometry, neighborhood_id, capture_method, created_at FROM blocks ${filterStr}`,
          params
        );
        blocksRes.rows.forEach(row => {
          geojson.features.push({
            type: "Feature",
            geometry: row.geometry,
            properties: { id: row.id, name: row.name, type: "block", neighborhood_id: row.neighborhood_id, capture_method: row.capture_method, created_at: row.created_at }
          });
        });
      }

      // Export Houses
      if (include_houses === "true") {
        const housesRes = await pool.query(
          `SELECT id, block_id, ST_AsGeoJSON(geom)::jsonb as geometry, house_number, created_at FROM houses ${filterStr.replace("neighborhood_id", "block_id IN (SELECT id FROM blocks WHERE neighborhood_id") + (neighborhood_ids ? ")" : "")}`,
          params
        );
        housesRes.rows.forEach(row => {
          geojson.features.push({
            type: "Feature",
            geometry: row.geometry,
            properties: { id: row.id, block_id: row.block_id, type: "house", house_number: row.house_number, created_at: row.created_at }
          });
        });
      }

      // Export Neighborhoods
      if (include_neighborhoods === "true") {
        const nbRes = await pool.query(
          `SELECT id, name, ST_AsGeoJSON(geom)::jsonb as geometry, created_at FROM neighborhoods ${filterStr.includes("neighborhood_id") ? "" : filterStr}`,
          filterStr.includes("neighborhood_id") ? [] : params
        );
        nbRes.rows.forEach(row => {
          geojson.features.push({
            type: "Feature",
            geometry: row.geometry,
            properties: { id: row.id, name: row.name, type: "neighborhood", created_at: row.created_at }
          });
        });
      }

      if (format === "csv") {
        const flatData = geojson.features.map(f => ({
          id: f.properties.id,
          name: f.properties.name || "",
          house_number: f.properties.house_number || "",
          type: f.properties.type,
          neighborhood_id: f.properties.neighborhood_id || "",
          block_id: f.properties.block_id || "",
          capture_method: f.properties.capture_method || "",
          created_at: f.properties.created_at,
          geometry_type: f.geometry.type
        }));
        const parser = new Parser();
        const csv = parser.parse(flatData);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=export.csv");
        return res.send(csv);
      }

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", "attachment; filename=export.geojson");
      res.send(geojson);

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al exportar datos" });
    }
  },

  generateReport: async (req, res) => {
    try {
      const stats = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM neighborhoods) as nb_count,
          (SELECT COUNT(*) FROM blocks) as block_count,
          (SELECT COUNT(*) FROM houses) as house_count,
          (SELECT SUM(ST_Area(geom::geography)) FROM neighborhoods) as total_area_nb,
          (SELECT SUM(ST_Area(geom::geography)) FROM blocks) as total_area_blocks,
          (SELECT SUM(ST_Area(geom::geography)) FROM houses) as total_area_houses
      `);

      const { nb_count, block_count, house_count, total_area_nb, total_area_blocks, total_area_houses } = stats.rows[0];

      const doc = new PDFDocument();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=reporte_estatal.pdf");
      doc.pipe(res);

      doc.fontSize(20).text("Reporte Estadístico - Sistema de Mapeo Geoespacial", { align: "center" });
      doc.moveDown();
      doc.fontSize(14).text(`Fecha: ${new Date().toLocaleDateString()}`);
      doc.moveDown();

      doc.fontSize(16).text("Resumen General", { underline: true });
      doc.fontSize(12).text(`Total de Barrios: ${nb_count}`);
      doc.fontSize(12).text(`Total de Cuadras: ${block_count}`);
      doc.fontSize(12).text(`Total de Viviendas: ${house_count}`);
      doc.moveDown();

      doc.fontSize(16).text("Áreas y Densidades", { underline: true });
      doc.fontSize(12).text(`Área Total Mapeada (Barrios): ${(total_area_nb / 10000).toFixed(2)} Ha`);
      doc.fontSize(12).text(`Área Total de Cuadras: ${(total_area_blocks / 10000).toFixed(2)} Ha`);
      doc.fontSize(12).text(`Área Total Construida (Casas): ${Number(total_area_houses).toFixed(2)} m²`);
      doc.fontSize(12).text(`Densidad Promedio: ${(house_count / (total_area_nb / 10000 || 1)).toFixed(2)} viviendas/Ha`);
      doc.moveDown();

      doc.fontSize(10).text("Generado por Mapping System Bogotá", { align: "right" });

      doc.end();

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al generar reporte" });
    }
  }
};

module.exports = exportController;

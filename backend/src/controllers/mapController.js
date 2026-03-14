const pool = require("../config/database");

exports.getMapState = async (req, res) => {
  try {
    const { bbox } = req.query;
    
    if (!bbox) {
      return res.status(400).json({ error: "Bbox parameter is required (minLng,minLat,maxLng,maxLat)" });
    }

    const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map(Number);

    // Consulta de bloques
    const blockQuery = `
      SELECT id, name, ST_AsGeoJSON(geom)::jsonb as geom, division_points, capture_method
      FROM blocks
      WHERE ST_Intersects(geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))
    `;

    // Consulta de casas
    const houseQuery = `
      SELECT id, block_id, ST_AsGeoJSON(geom)::jsonb as geom, house_number
      FROM houses
      WHERE ST_Intersects(geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))
    `;

    const [blockResult, houseResult] = await Promise.all([
      pool.query(blockQuery, [minLng, minLat, maxLng, maxLat]),
      pool.query(houseQuery, [minLng, minLat, maxLng, maxLat])
    ]);

    // Consulta de barrios
    const neighborhoodQuery = `
      SELECT id, name, ST_AsGeoJSON(geom)::jsonb as geometry
      FROM neighborhoods
      WHERE ST_Intersects(geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))
    `;
    const neighborhoodResult = await pool.query(neighborhoodQuery, [minLng, minLat, maxLng, maxLat]);

    res.json({
      blocks: blockResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        geometry: row.geom,
        division_points: row.division_points,
        capture_method: row.capture_method
      })),
      houses: houseResult.rows.map(row => ({
        id: row.id,
        block_id: row.block_id,
        geometry: row.geom,
        house_number: row.house_number
      })),
      neighborhoods: neighborhoodResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        geometry: row.geometry
      }))
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching map data" });
  }
};

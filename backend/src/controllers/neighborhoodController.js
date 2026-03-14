const pool = require("../config/database");

/**
 * Listar barrios, opcionalmente por Bbox
 */
exports.getNeighborhoods = async (req, res) => {
  const { bbox } = req.query; // west, south, east, north
  
  try {
    let query = `
      SELECT id, name, ST_AsGeoJSON(geom)::jsonb as geometry, synced_at
      FROM neighborhoods
    `;
    const params = [];

    if (bbox) {
      const [west, south, east, north] = bbox.split(",").map(Number);
      query += ` WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)`;
      params.push(west, south, east, north);
    }

    const { rows } = await pool.query(query, params);
    
    const featureCollection = {
      type: "FeatureCollection",
      features: rows.map(row => ({
        type: "Feature",
        id: row.id,
        geometry: row.geometry,
        properties: {
          name: row.name,
          synced_at: row.synced_at
        }
      }))
    };

    res.json(featureCollection);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching neighborhoods" });
  }
};

/**
 * Crear un barrio
 */
exports.createNeighborhood = async (req, res) => {
  const { name, geom } = req.body;
  
  try {
    const query = `
      INSERT INTO neighborhoods (name, geom)
      VALUES ($1, ST_GeomFromGeoJSON($2))
      RETURNING id, name, ST_AsGeoJSON(geom)::jsonb as geometry
    `;
    
    const { rows } = await pool.query(query, [name, JSON.stringify(geom)]);
    res.status(201).json({
      message: "Neighborhood created successfully",
      neighborhood: rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating neighborhood" });
  }
};

/**
 * Actualizar un barrio
 */
exports.updateNeighborhood = async (req, res) => {
  const { id } = req.params;
  const { name, geom } = req.body;
  
  try {
    const query = `
      UPDATE neighborhoods
      SET name = COALESCE($1, name),
          geom = CASE WHEN $2::jsonb IS NOT NULL THEN ST_GeomFromGeoJSON($2) ELSE geom END,
          updated_at = now()
      WHERE id = $3
      RETURNING id, name, ST_AsGeoJSON(geom)::jsonb as geometry
    `;
    
    const { rows } = await pool.query(query, [name, JSON.stringify(geom), id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Neighborhood not found" });
    }
    
    res.json({
      message: "Neighborhood updated successfully",
      neighborhood: rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error updating neighborhood" });
  }
};

/**
 * Eliminar un barrio
 */
exports.deleteNeighborhood = async (req, res) => {
  const { id } = req.params;
  
  try {
    const { rowCount } = await pool.query("DELETE FROM neighborhoods WHERE id = $1", [id]);
    
    if (rowCount === 0) {
      return res.status(404).json({ error: "Neighborhood not found" });
    }
    
    res.json({ message: "Neighborhood deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error deleting neighborhood" });
  }
};

/**
 * Asignar cuadras a un barrio
 */
exports.assignBlocks = async (req, res) => {
  const { id } = req.params;
  const { block_ids } = req.body; // Array de UUIDs
  
  if (!Array.isArray(block_ids)) {
    return res.status(400).json({ error: "block_ids must be an array" });
  }
  
  try {
    await pool.query(
      "UPDATE blocks SET neighborhood_id = $1 WHERE id = ANY($2)",
      [id, block_ids]
    );
    res.json({ message: "Blocks assigned successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error assigning blocks" });
  }
};

const pool = require("../config/database");
const turf = require("@turf/turf");
const { generateHousesFromBlock } = require("../services/houseGeneration");

// Helper to ensure first and last points are identical
function ensureClosedPolygon(coordinates) {
  if (!coordinates || !coordinates[0] || coordinates[0].length === 0) return coordinates;
  const ring = [...coordinates[0]];
  if (ring.length < 3) return coordinates;
  
  const first = ring[0];
  const last = ring[ring.length - 1];
  
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([...first]);
  }
  return [ring, ...coordinates.slice(1)];
}

function validateAndClose(coordinates) {
  const closed = ensureClosedPolygon(coordinates);
  const poly = turf.polygon(closed);
  if (!turf.booleanValid(poly)) {
    throw new Error("Invalid polygon geometry (self-intersecting or too few points)");
  }
  return closed;
}

exports.createBlock = async (req, res) => {
  try {
    const { name, geom, division_points, capture_method } = req.body;

    if (!geom || geom.type !== "Polygon") {
      return res.status(400).json({ error: "Invalid geometry. GeoJSON Polygon required." });
    }

    // Validar geometría con Turf
    if (!turf.booleanValid(geom)) {
      return res.status(400).json({ error: "Self-intersecting or invalid polygon geometry." });
    }

    await pool.query("BEGIN");

    const query = `
      INSERT INTO blocks (name, geom, division_points, capture_method)
      VALUES ($1, ST_GeomFromGeoJSON($2), $3, $4)
      RETURNING id, ST_AsGeoJSON(geom)::jsonb as geom
    `;

    const result = await pool.query(query, [
      name || "Nueva Cuadra",
      JSON.stringify(geom),
      JSON.stringify(division_points || []),
      capture_method || 'manual'
    ]);

    const blockId = result.rows[0].id;
    const insertedGeom = result.rows[0].geom;

    // Generar casas automáticamente
    let generatedHouses = [];
    if (division_points && division_points.length >= 2) {
      const houseGeoms = generateHousesFromBlock(insertedGeom, division_points);
      
      for (const hGeom of houseGeoms) {
        const houseQuery = `
          INSERT INTO houses (block_id, geom)
          VALUES ($1, ST_GeomFromGeoJSON($2))
          RETURNING id, ST_AsGeoJSON(geom)::jsonb as geom
        `;
        const hResult = await pool.query(houseQuery, [blockId, JSON.stringify(hGeom)]);
        generatedHouses.push({
          id: hResult.rows[0].id,
          geometry: hResult.rows[0].geom
        });
      }
    }

    await pool.query("COMMIT");

    res.json({
      message: "Block and houses created",
      block: {
        id: blockId,
        geometry: insertedGeom
      },
      houses: generatedHouses
    });

  } catch (error) {
    await pool.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Error creating block and houses" });
  }
};

exports.getBlocks = async (req, res) => {

  try {

    const query = `
      SELECT
        id,
        name,
        ST_AsGeoJSON(geom) as geom
      FROM blocks
    `;

    const result = await pool.query(query);

    const blocks = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      geometry: JSON.parse(row.geom)
    }));

    res.json(blocks);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Error fetching blocks"
    });

  }

};
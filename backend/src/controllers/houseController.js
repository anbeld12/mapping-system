const pool = require("../config/database");
const turf = require("@turf/turf");
const { generateHousesFromBlock } = require("../services/houseGeneration");

exports.generateHouses = async (req, res) => {
  try {
    const blockId = Number(req.body.block_id);
    const houseCount = Number(req.body.house_count);

    if (!blockId || !houseCount || houseCount < 1) {
      return res.status(400).json({ error: "block_id and house_count are required" });
    }

    const blockQuery = `
      SELECT id, ST_AsGeoJSON(geom) as geom
      FROM blocks
      WHERE id = $1
    `;

    const blockResult = await pool.query(blockQuery, [blockId]);

    if (blockResult.rowCount === 0) {
      return res.status(404).json({ error: "Block not found" });
    }

    const blockGeoJSON = JSON.parse(blockResult.rows[0].geom);

    // Derive evenly spaced division points along the first edge
    let houseGeometries;
    try {
      if (blockGeoJSON.type !== "Polygon") {
        throw new Error("Invalid block geometry. Expected GeoJSON Polygon.");
      }
      const outerRing = blockGeoJSON.coordinates[0];
      if (!outerRing || outerRing.length < 4 || houseCount < 1) {
        throw new Error("Block has too few vertices to subdivide.");
      }

      const frontLine = turf.lineString([outerRing[0], outerRing[1]]);
      const totalLen = turf.length(frontLine, { units: "kilometers" });
      const segLen = totalLen / houseCount;

      // Build N+1 equally spaced division points along the first two vertices
      const divisionPoints = [];
      for (let i = 0; i <= houseCount; i++) {
        const pt = turf.along(frontLine, segLen * i, { units: "kilometers" });
        divisionPoints.push(pt.geometry.coordinates);
      }

      houseGeometries = generateHousesFromBlock(blockGeoJSON, divisionPoints);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!houseGeometries || houseGeometries.length === 0) {
      return res.status(400).json({ error: "Could not generate houses from this geometry" });
    }

    await pool.query("BEGIN");

    const createdHouses = [];
    for (const geom of houseGeometries) {
      const insertQuery = `
        INSERT INTO houses (block_id, geom)
        VALUES ($1, ST_GeomFromGeoJSON($2))
        RETURNING id
      `;

      const insertResult = await pool.query(insertQuery, [blockId, JSON.stringify(geom)]);
      createdHouses.push({
        id: insertResult.rows[0].id,
        geometry: geom
      });
    }

    await pool.query("COMMIT");

    res.json(createdHouses);
  } catch (error) {
    try { await pool.query("ROLLBACK"); } catch (_) {}
    console.error(error);
    res.status(500).json({ error: "Error generating houses" });
  }
};

exports.generateHousesByWidth = async (req, res) => {
  try {
    const blockId = Number(req.body.block_id);
    const lotWidth = Number(req.body.lot_width);

    if (!blockId || !lotWidth || lotWidth <= 0) {
      return res.status(400).json({
        error: "block_id and lot_width are required"
      });
    }

    const blockQuery = `
      SELECT
        id,
        ST_AsGeoJSON(geom) as geom
      FROM blocks
      WHERE id = $1
    `;

    const blockResult = await pool.query(blockQuery, [blockId]);

    if (blockResult.rowCount === 0) {
      return res.status(404).json({
        error: "Block not found"
      });
    }

    const blockGeoJSON = JSON.parse(blockResult.rows[0].geom);

    let houseGeometries;
    try {
      if (blockGeoJSON.type !== "Polygon") {
        throw new Error("Invalid block geometry. Expected GeoJSON Polygon.");
      }
      const outerRing = blockGeoJSON.coordinates[0];
      const frontLine = turf.lineString([outerRing[0], outerRing[1]]);
      const lengthKm = turf.length(frontLine, { units: "kilometers" });
      const houseCount = Math.floor((lengthKm * 1000) / lotWidth);

      if (houseCount < 1) {
        return res.status(400).json({ error: "Lot width larger than block frontage" });
      }

      const segLen = lengthKm / houseCount;
      const divisionPoints = [];
      for (let i = 0; i <= houseCount; i++) {
        const pt = turf.along(frontLine, segLen * i, { units: "kilometers" });
        divisionPoints.push(pt.geometry.coordinates);
      }

      houseGeometries = generateHousesFromBlock(blockGeoJSON, divisionPoints);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!houseGeometries || houseGeometries.length === 0) {
      return res.status(400).json({ error: "Could not generate houses from this geometry" });
    }

    await pool.query("BEGIN");

    const createdHouses = [];

    for (const geom of houseGeometries) {

      const insertQuery = `
        INSERT INTO houses (block_id, geom)
        VALUES ($1, ST_GeomFromGeoJSON($2))
        RETURNING id
      `;

      const insertResult = await pool.query(
        insertQuery,
        [blockId, JSON.stringify(geom)]
      );

      createdHouses.push({
        id: insertResult.rows[0].id,
        geometry: geom
      });

    }

    await pool.query("COMMIT");

    res.json(createdHouses);

  } catch (error) {
    try { await pool.query("ROLLBACK"); } catch (_) {}
    console.error(error);

    res.status(500).json({
      error: "Error generating houses by width"
    });

  }

};

exports.getHouses = async (req, res) => {
  try {
    const { bbox } = req.query;
    let query;
    let params = [];

    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map(Number);
      query = `
        SELECT id, block_id, ST_AsGeoJSON(geom)::jsonb as geom, house_number, synced_at
        FROM houses
        WHERE ST_Intersects(geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))
      `;
      params = [minLng, minLat, maxLng, maxLat];
    } else {
      query = `
        SELECT id, block_id, ST_AsGeoJSON(geom)::jsonb as geom, house_number, synced_at
        FROM houses
      `;
    }

    const result = await pool.query(query, params);
    res.json(result.rows.map(row => ({
      id: row.id,
      block_id: row.block_id,
      geometry: row.geom,
      house_number: row.house_number,
      synced_at: row.synced_at
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching houses" });
  }
};

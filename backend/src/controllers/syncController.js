const pool = require("../config/database");
const { generateHousesFromBlock } = require("../services/houseGeneration");

exports.syncChanges = async (req, res) => {
  const { changes } = req.body; // Array de { operation, entity_type, entity_id, data }
  
  if (!Array.isArray(changes)) {
    return res.status(400).json({ error: "Changes must be an array" });
  }

  const results = [];
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const change of changes) {
      const { operation, entity_type, entity_id, data } = change;

      if (entity_type === "block") {
        const { name, geom, division_points, capture_method, neighborhood_id, predios = [] } = data;
        
        if (operation === "INSERT") {
          const query = `
            INSERT INTO blocks (id, name, geom, division_points, capture_method, neighborhood_id)
            VALUES ($1, $2, ST_GeomFromGeoJSON($3), $4, $5, $6)
            ON CONFLICT (id) DO UPDATE SET 
              name = EXCLUDED.name,
              geom = EXCLUDED.geom,
              division_points = EXCLUDED.division_points,
              neighborhood_id = EXCLUDED.neighborhood_id,
              updated_at = now()
            RETURNING id, ST_AsGeoJSON(geom)::jsonb as geom
          `;
          
          const result = await client.query(query, [
            entity_id,
            name,
            JSON.stringify(geom),
            JSON.stringify(division_points || []),
            capture_method,
            neighborhood_id
          ]);

          const blockId = result.rows[0].id;
          const blockGeom = result.rows[0].geom;

          if (predios && predios.length > 0) {
            await client.query("DELETE FROM predios WHERE block_id = $1", [blockId]);
            for (const predio of predios) {
              const predioQuery = `
                INSERT INTO predios (block_id, tipo, geom, numero_casa)
                VALUES ($1, $2, ST_GeomFromGeoJSON($3), $4)
              `;
              await client.query(predioQuery, [
                blockId,
                predio.tipo,
                JSON.stringify(predio.geom),
                predio.numero_casa
              ]);
            }
          }

          if (division_points && division_points.length >= 2) {
            await client.query("DELETE FROM houses WHERE block_id = $1", [blockId]);
            const houseGeoms = generateHousesFromBlock(blockGeom, division_points);
            for (const hGeom of houseGeoms) {
              await client.query(
                "INSERT INTO houses (block_id, geom) VALUES ($1, ST_GeomFromGeoJSON($2))",
                [blockId, JSON.stringify(hGeom)]
              );
            }
          }
          results.push({ localId: entity_id, serverId: blockId, status: "success" });
        } 
        else if (operation === "UPDATE") {
          const query = `
            UPDATE blocks 
            SET name = COALESCE($1, name),
                geom = ST_GeomFromGeoJSON($2),
                division_points = $3,
                updated_at = now()
            WHERE id = $4
            RETURNING id, ST_AsGeoJSON(geom)::jsonb as geom
          `;
          
          const result = await client.query(query, [
            name,
            JSON.stringify(geom),
            JSON.stringify(division_points),
            entity_id
          ]);

          if (result.rows.length > 0) {
            const blockId = result.rows[0].id;
            const blockGeom = result.rows[0].geom;
            await client.query("DELETE FROM houses WHERE block_id = $1", [blockId]);
            if (division_points && division_points.length >= 2) {
              const houseGeoms = generateHousesFromBlock(blockGeom, division_points);
              for (const hGeom of houseGeoms) {
                await client.query(
                  "INSERT INTO houses (block_id, geom) VALUES ($1, ST_GeomFromGeoJSON($2))",
                  [blockId, JSON.stringify(hGeom)]
                );
              }
            }
            results.push({ localId: entity_id, status: "updated" });
          } else {
            results.push({ localId: entity_id, status: "not_found" });
          }
        }
        else if (operation === "DELETE") {
          await client.query("DELETE FROM blocks WHERE id = $1", [entity_id]);
          results.push({ localId: entity_id, status: "deleted" });
        }
      } else if (entity_type === "neighborhood") {
        if (operation === "INSERT") {
          const { name, geom } = data;
          const query = `
            INSERT INTO neighborhoods (id, name, geom)
            VALUES ($1, $2, ST_GeomFromGeoJSON($3))
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              geom = EXCLUDED.geom,
              updated_at = now()
            RETURNING id
          `;
          await client.query(query, [entity_id, name, JSON.stringify(geom)]);
          results.push({ localId: entity_id, status: "success" });
        }
        else if (operation === "UPDATE") {
          const { name, geom } = data;
          const query = `
            UPDATE neighborhoods
            SET name = COALESCE($1, name),
                geom = CASE WHEN $2::jsonb IS NOT NULL THEN ST_GeomFromGeoJSON($2) ELSE geom END,
                updated_at = now()
            WHERE id = $3
          `;
          await client.query(query, [name, JSON.stringify(geom), entity_id]);
          results.push({ localId: entity_id, status: "updated" });
        }
        else if (operation === "DELETE") {
          await client.query("DELETE FROM neighborhoods WHERE id = $1", [entity_id]);
          results.push({ localId: entity_id, status: "deleted" });
        }
      }
      // Se pueden añadir más entidades aquí (e.g. houses directas si se requiere)
    }

    await client.query("COMMIT");
    res.json({ message: "Sync complete", results });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Sync error:", error);
    res.status(500).json({ error: "Sync failed", details: error.message });
  } finally {
    client.release();
  }
};

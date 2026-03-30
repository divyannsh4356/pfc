import { Router } from "express";
import { pool } from "../../db.js";
import { httpError } from "../../utils/httpError.js";
import { isCompetitionStarted } from "../../services/competition.js";

const router = Router();

const ALLOWED_TYPES = new Set(["stock", "commodity", "crypto", "forex"]);

function isPositivePrice(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

router.post("/assets", async (req, res) => {
  const { name, type, startingPrice } = req.body ?? {};
  if (!name || !type || startingPrice === undefined) {
    throw httpError(400, "name, type, and startingPrice are required", "VALIDATION_ERROR");
  }
  if (!ALLOWED_TYPES.has(type)) {
    throw httpError(400, "Invalid asset type", "VALIDATION_ERROR");
  }
  if (!isPositivePrice(startingPrice)) {
    throw httpError(400, "startingPrice must be greater than 0", "VALIDATION_ERROR");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const dup = await client.query(
      `SELECT 1 FROM assets WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [name]
    );
    if (dup.rowCount > 0) {
      throw httpError(409, "Asset name already exists", "DUPLICATE_ASSET");
    }

    const assetResult = await client.query(
      `INSERT INTO assets (name, type, current_price)
       VALUES ($1, $2, $3)
       RETURNING id, name, type, current_price`,
      [name, type, startingPrice]
    );
    const asset = assetResult.rows[0];

    await client.query(
      `INSERT INTO asset_price_history (asset_id, round_number, price)
       VALUES ($1, 0, $2)`,
      [asset.id, startingPrice]
    );

    await client.query("COMMIT");
    return res.status(201).json({ asset });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

router.get("/assets", async (req, res) => {
  const result = await pool.query(
    `SELECT id, name, type, current_price FROM assets ORDER BY id`
  );
  return res.json({ assets: result.rows });
});

router.put("/assets/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    throw httpError(400, "Invalid asset id", "VALIDATION_ERROR");
  }

  if (await isCompetitionStarted()) {
    throw httpError(
      400,
      "Cannot edit assets after competition has started",
      "COMPETITION_STARTED"
    );
  }

  const { name, type, current_price } = req.body ?? {};
  if (name === undefined && type === undefined && current_price === undefined) {
    throw httpError(400, "No fields to update", "VALIDATION_ERROR");
  }
  if (type !== undefined && !ALLOWED_TYPES.has(type)) {
    throw httpError(400, "Invalid asset type", "VALIDATION_ERROR");
  }
  if (current_price !== undefined && !isPositivePrice(current_price)) {
    throw httpError(400, "current_price must be greater than 0", "VALIDATION_ERROR");
  }

  const existing = await pool.query(`SELECT id FROM assets WHERE id = $1`, [id]);
  if (existing.rowCount === 0) {
    throw httpError(404, "Asset not found", "NOT_FOUND");
  }

  if (name !== undefined) {
    const dup = await pool.query(
      `SELECT 1 FROM assets WHERE LOWER(name) = LOWER($1) AND id <> $2 LIMIT 1`,
      [name, id]
    );
    if (dup.rowCount > 0) {
      throw httpError(409, "Asset name already exists", "DUPLICATE_ASSET");
    }
  }

  const updates = [];
  const values = [];
  let p = 1;

  if (name !== undefined) {
    updates.push(`name = $${p++}`);
    values.push(name);
  }
  if (type !== undefined) {
    updates.push(`type = $${p++}`);
    values.push(type);
  }
  if (current_price !== undefined) {
    updates.push(`current_price = $${p++}`);
    values.push(current_price);
  }

  values.push(id);
  const result = await pool.query(
    `UPDATE assets SET ${updates.join(", ")}
     WHERE id = $${p}
     RETURNING id, name, type, current_price`,
    values
  );

  const asset = result.rows[0];
  await pool.query(
    `UPDATE asset_price_history SET price = $1
     WHERE asset_id = $2 AND round_number = 0`,
    [asset.current_price, id]
  );

  return res.json({ asset });
});

router.delete("/assets/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    throw httpError(400, "Invalid asset id", "VALIDATION_ERROR");
  }

  if (await isCompetitionStarted()) {
    throw httpError(
      400,
      "Cannot delete assets after competition has started",
      "COMPETITION_STARTED"
    );
  }

  const assetCheck = await pool.query(`SELECT id FROM assets WHERE id = $1`, [id]);
  if (assetCheck.rowCount === 0) {
    throw httpError(404, "Asset not found", "NOT_FOUND");
  }

  const orders = await pool.query(
    `SELECT 1 FROM orders WHERE asset_id = $1 LIMIT 1`,
    [id]
  );
  if (orders.rowCount > 0) {
    throw httpError(400, "Asset has trade history", "HAS_ORDERS");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM news_impact WHERE asset_id = $1`, [id]);
    await client.query(`DELETE FROM holdings WHERE asset_id = $1`, [id]);
    await client.query(`DELETE FROM asset_price_history WHERE asset_id = $1`, [id]);
    await client.query(`DELETE FROM assets WHERE id = $1`, [id]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return res.status(200).json({ ok: true });
});

export default router;

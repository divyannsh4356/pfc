import { Router } from "express";
import { pool } from "../../db.js";
import { httpError } from "../../utils/httpError.js";

const router = Router();

function parseRoundNumber(param) {
  const n = Number(param);
  if (!Number.isInteger(n) || n < 1 || n > 6) {
    return null;
  }
  return n;
}

function isValidImpact(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= -1 && n <= 1;
}

router.get("/rounds", async (req, res) => {
  const roundsResult = await pool.query(
    `SELECT r.id, r.round_number, r.status, r.timer_duration_seconds, r.started_at, r.ended_at,
            n.id AS news_id, n.headline, n.body
     FROM rounds r
     LEFT JOIN news n ON n.round_id = r.id
     ORDER BY r.round_number`
  );

  const rounds = [];
  for (const row of roundsResult.rows) {
    let impacts = [];
    if (row.news_id) {
      const impactResult = await pool.query(
        `SELECT ni.asset_id AS "assetId",
                a.name AS "assetName",
                ni.impact_percentage AS "impactPercentage"
         FROM news_impact ni
         JOIN assets a ON a.id = ni.asset_id
         WHERE ni.news_id = $1
         ORDER BY ni.asset_id`,
        [row.news_id]
      );
      impacts = impactResult.rows;
    }

    rounds.push({
      id: row.id,
      roundNumber: row.round_number,
      status: row.status,
      timerDurationSeconds: row.timer_duration_seconds,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      news: row.news_id
        ? {
            headline: row.headline,
            body: row.body,
            impacts,
          }
        : null,
    });
  }

  return res.json({ rounds });
});

router.put("/rounds/:roundNumber/timer", async (req, res) => {
  const roundNumber = parseRoundNumber(req.params.roundNumber);
  if (roundNumber === null) {
    throw httpError(400, "roundNumber must be between 1 and 6", "VALIDATION_ERROR");
  }

  const { timerDurationSeconds } = req.body ?? {};
  const seconds = Number(timerDurationSeconds);
  if (!Number.isInteger(seconds) || seconds <= 0) {
    throw httpError(
      400,
      "timerDurationSeconds must be a positive integer",
      "VALIDATION_ERROR"
    );
  }

  const result = await pool.query(
    `UPDATE rounds
     SET timer_duration_seconds = $1
     WHERE round_number = $2 AND status = 'pending'
     RETURNING id, round_number, status, timer_duration_seconds`,
    [seconds, roundNumber]
  );

  if (result.rowCount === 0) {
    const exists = await pool.query(
      `SELECT status FROM rounds WHERE round_number = $1`,
      [roundNumber]
    );
    if (exists.rowCount === 0) {
      throw httpError(404, "Round not found", "NOT_FOUND");
    }
    throw httpError(
      400,
      "Timer can only be changed while round is pending",
      "ROUND_NOT_PENDING"
    );
  }

  return res.json({ round: result.rows[0] });
});

router.post("/rounds/:roundNumber/news", async (req, res) => {
  const roundNumber = parseRoundNumber(req.params.roundNumber);
  if (roundNumber === null) {
    throw httpError(400, "roundNumber must be between 1 and 6", "VALIDATION_ERROR");
  }

  const { headline, body, impacts } = req.body ?? {};
  if (!headline || !body) {
    throw httpError(400, "headline and body are required", "VALIDATION_ERROR");
  }
  if (impacts !== undefined && !Array.isArray(impacts)) {
    throw httpError(400, "impacts must be an array", "VALIDATION_ERROR");
  }

  const impactList = impacts ?? [];
  const seenAssetIds = new Set();
  for (const row of impactList) {
    const assetId = Number(row?.assetId);
    if (!Number.isInteger(assetId)) {
      throw httpError(400, "Each impact requires a valid assetId", "VALIDATION_ERROR");
    }
    if (seenAssetIds.has(assetId)) {
      throw httpError(400, "Duplicate assetId in impacts", "VALIDATION_ERROR");
    }
    seenAssetIds.add(assetId);
    if (!isValidImpact(row.impactPercentage)) {
      throw httpError(
        400,
        "impactPercentage must be between -1.0 and 1.0",
        "VALIDATION_ERROR"
      );
    }
  }

  const roundResult = await pool.query(
    `SELECT id, status FROM rounds WHERE round_number = $1`,
    [roundNumber]
  );
  if (roundResult.rowCount === 0) {
    throw httpError(404, "Round not found", "NOT_FOUND");
  }

  const roundRow = roundResult.rows[0];
  if (roundRow.status !== "pending") {
    throw httpError(
      400,
      "Cannot edit news for a round that is open or closed",
      "ROUND_NOT_PENDING"
    );
  }

  if (impactList.length > 0) {
    const assetIds = impactList.map((i) => Number(i.assetId));
    const assetCheck = await pool.query(
      `SELECT COUNT(*)::int AS c FROM assets WHERE id = ANY($1::int[])`,
      [assetIds]
    );
    if (assetCheck.rows[0].c !== assetIds.length) {
      throw httpError(400, "Invalid assetId in impacts", "INVALID_ASSET");
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existingNews = await client.query(
      `SELECT id FROM news WHERE round_id = $1`,
      [roundRow.id]
    );

    let newsId;
    if (existingNews.rowCount > 0) {
      newsId = existingNews.rows[0].id;
      await client.query(`DELETE FROM news_impact WHERE news_id = $1`, [newsId]);
      await client.query(
        `UPDATE news SET headline = $1, body = $2 WHERE id = $3`,
        [headline, body, newsId]
      );
    } else {
      const insertNews = await client.query(
        `INSERT INTO news (round_id, headline, body)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [roundRow.id, headline, body]
      );
      newsId = insertNews.rows[0].id;
    }

    for (const row of impactList) {
      await client.query(
        `INSERT INTO news_impact (news_id, asset_id, impact_percentage)
         VALUES ($1, $2, $3)`,
        [newsId, Number(row.assetId), row.impactPercentage]
      );
    }

    await client.query("COMMIT");

    const impactResult = await pool.query(
      `SELECT ni.asset_id AS "assetId",
              a.name AS "assetName",
              ni.impact_percentage AS "impactPercentage"
       FROM news_impact ni
       JOIN assets a ON a.id = ni.asset_id
       WHERE ni.news_id = $1
       ORDER BY ni.asset_id`,
      [newsId]
    );

    return res.status(201).json({
      roundNumber,
      news: {
        headline,
        body,
        impacts: impactResult.rows,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

export default router;

import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../../db.js";
import { httpError } from "../../utils/httpError.js";
import { isCompetitionStarted } from "../../services/competition.js";

const router = Router();

function isPositiveNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

function isAdminRecord(row) {
  return row.role === "admin" || String(row.team_name).toLowerCase() === "admin";
}

async function findUserById(client, id) {
  const result = await client.query(
    `SELECT id, team_name, password_hash, role, cash_balance FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

async function teamNameTaken(client, teamName, excludeId = null) {
  const result = await client.query(
    excludeId
      ? `SELECT 1 FROM users WHERE LOWER(team_name) = LOWER($1) AND id <> $2 LIMIT 1`
      : `SELECT 1 FROM users WHERE LOWER(team_name) = LOWER($1) LIMIT 1`,
    excludeId ? [teamName, excludeId] : [teamName]
  );
  return result.rowCount > 0;
}

router.post("/teams/bulk", async (req, res) => {
  const { teams } = req.body ?? {};
  if (!Array.isArray(teams) || teams.length === 0) {
    throw httpError(400, "teams array is required", "VALIDATION_ERROR");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const seenNames = new Set();
    for (const entry of teams) {
      const { teamName, password, startingCash } = entry ?? {};
      if (!teamName || !password) {
        throw httpError(400, "Each team requires teamName and password", "VALIDATION_ERROR");
      }
      if (!isPositiveNumber(startingCash)) {
        throw httpError(400, "startingCash must be a positive number", "VALIDATION_ERROR");
      }
      const key = String(teamName).toLowerCase();
      if (seenNames.has(key)) {
        throw httpError(409, "Team name already exists", "DUPLICATE_TEAM");
      }
      seenNames.add(key);
      if (await teamNameTaken(client, teamName)) {
        throw httpError(409, "Team name already exists", "DUPLICATE_TEAM");
      }
    }

    const created = [];
    for (const entry of teams) {
      const { teamName, password, startingCash } = entry;
      const passwordHash = await bcrypt.hash(password, 10);
      const insert = await client.query(
        `INSERT INTO users (team_name, password_hash, role, cash_balance)
         VALUES ($1, $2, 'team', $3)
         RETURNING id, team_name, cash_balance, role`,
        [teamName, passwordHash, startingCash]
      );
      created.push(insert.rows[0]);
    }

    await client.query("COMMIT");
    return res.status(201).json({ teams: created });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

router.post("/teams", async (req, res) => {
  const { teamName, password, startingCash } = req.body ?? {};
  if (!teamName || !password) {
    throw httpError(400, "teamName and password are required", "VALIDATION_ERROR");
  }
  if (!isPositiveNumber(startingCash)) {
    throw httpError(400, "startingCash must be a positive number", "VALIDATION_ERROR");
  }

  if (await teamNameTaken(pool, teamName)) {
    throw httpError(409, "Team name already exists", "DUPLICATE_TEAM");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (team_name, password_hash, role, cash_balance)
     VALUES ($1, $2, 'team', $3)
     RETURNING id, team_name, cash_balance, role`,
    [teamName, passwordHash, startingCash]
  );

  return res.status(201).json({ team: result.rows[0] });
});

router.get("/teams", async (req, res) => {
  const result = await pool.query(
    `SELECT id, team_name, cash_balance, role
     FROM users
     WHERE role = 'team'
     ORDER BY id`
  );
  return res.json({ teams: result.rows });
});

router.put("/teams/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    throw httpError(400, "Invalid team id", "VALIDATION_ERROR");
  }

  const user = await findUserById(pool, id);
  if (!user) {
    throw httpError(404, "Team not found", "NOT_FOUND");
  }
  if (isAdminRecord(user)) {
    throw httpError(403, "Cannot modify admin user", "FORBIDDEN");
  }
  if (user.role !== "team") {
    throw httpError(403, "Cannot modify admin user", "FORBIDDEN");
  }

  const { team_name, password, cash_balance } = req.body ?? {};
  if (
    team_name === undefined &&
    password === undefined &&
    cash_balance === undefined
  ) {
    throw httpError(400, "No fields to update", "VALIDATION_ERROR");
  }

  if (team_name !== undefined) {
    if (await teamNameTaken(pool, team_name, id)) {
      throw httpError(409, "Team name already exists", "DUPLICATE_TEAM");
    }
  }

  if (cash_balance !== undefined) {
    const n = Number(cash_balance);
    if (!Number.isFinite(n) || n < 0) {
      throw httpError(400, "cash_balance must be a non-negative number", "VALIDATION_ERROR");
    }
  }

  const updates = [];
  const values = [];
  let p = 1;

  if (team_name !== undefined) {
    updates.push(`team_name = $${p++}`);
    values.push(team_name);
  }
  if (password !== undefined) {
    const passwordHash = await bcrypt.hash(password, 10);
    updates.push(`password_hash = $${p++}`);
    values.push(passwordHash);
  }
  if (cash_balance !== undefined) {
    updates.push(`cash_balance = $${p++}`);
    values.push(cash_balance);
  }

  values.push(id);
  const result = await pool.query(
    `UPDATE users SET ${updates.join(", ")}
     WHERE id = $${p} AND role = 'team'
     RETURNING id, team_name, cash_balance, role`,
    values
  );

  return res.json({ team: result.rows[0] });
});

router.delete("/teams/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    throw httpError(400, "Invalid team id", "VALIDATION_ERROR");
  }

  if (await isCompetitionStarted()) {
    throw httpError(
      400,
      "Cannot delete team after competition has started",
      "COMPETITION_STARTED"
    );
  }

  const user = await findUserById(pool, id);
  if (!user) {
    throw httpError(404, "Team not found", "NOT_FOUND");
  }
  if (isAdminRecord(user) || user.role !== "team") {
    throw httpError(403, "Cannot delete admin user", "FORBIDDEN");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM holdings WHERE team_id = $1`, [id]);
    await client.query(`DELETE FROM orders WHERE team_id = $1`, [id]);
    await client.query(`DELETE FROM users WHERE id = $1 AND role = 'team'`, [id]);
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

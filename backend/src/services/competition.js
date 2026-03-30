import { pool } from "../db.js";

export async function isCompetitionStarted(client = pool) {
  const result = await client.query(
    `SELECT 1 FROM rounds WHERE status IN ('open', 'closed') LIMIT 1`
  );
  return result.rowCount > 0;
}

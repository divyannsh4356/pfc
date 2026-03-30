import { pool } from "../db.js";

export async function ensureRounds() {
  for (let roundNumber = 1; roundNumber <= 6; roundNumber += 1) {
    await pool.query(
      `INSERT INTO rounds (round_number, status, timer_duration_seconds)
       VALUES ($1, 'pending', 300)
       ON CONFLICT (round_number) DO NOTHING`,
      [roundNumber]
    );
  }
}

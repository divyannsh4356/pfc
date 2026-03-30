import bcrypt from "bcryptjs";
import { pool } from "../db.js";

export async function seedAdminUser() {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    throw new Error("ADMIN_PASSWORD is required");
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await pool.query(
    `INSERT INTO users (team_name, password_hash, role, cash_balance)
     VALUES ('admin', $1, 'admin', 0)
     ON CONFLICT (team_name) DO UPDATE
     SET password_hash = EXCLUDED.password_hash,
         role = 'admin'`,
    [passwordHash]
  );
}

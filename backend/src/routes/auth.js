import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { team_name: teamName, password } = req.body ?? {};

  if (!teamName || !password) {
    return res
      .status(400)
      .json({ error: "team_name and password are required", code: "VALIDATION_ERROR" });
  }

  const result = await pool.query(
    `SELECT id, team_name, password_hash, role
     FROM users
     WHERE LOWER(team_name) = LOWER($1)
     LIMIT 1`,
    [teamName]
  );

  const user = result.rows[0];

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials", code: "INVALID_CREDENTIALS" });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    return res.status(401).json({ error: "Invalid credentials", code: "INVALID_CREDENTIALS" });
  }

  const payload = {
    userId: user.id,
    teamName: user.team_name,
    role: user.role,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "12h" });

  return res.status(200).json({ token, user: payload });
});

router.post("/logout", async (req, res) => {
  return res.status(200).json({ message: "Logged out" });
});

router.get("/me", requireAuth, async (req, res) => {
  const { userId } = req.user;
  const result = await pool.query(
    `SELECT id, team_name, role FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );

  const user = result.rows[0];
  if (!user) {
    return res.status(401).json({ error: "Invalid token", code: "INVALID_TOKEN" });
  }

  return res.status(200).json({
    user: { userId: user.id, teamName: user.team_name, role: user.role },
  });
});

export default router;

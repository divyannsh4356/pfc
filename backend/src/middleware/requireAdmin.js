import { requireAuth } from "./requireAuth.js";

export function requireAdmin(req, res, next) {
  return requireAuth(req, res, () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden", code: "FORBIDDEN" });
    }

    return next();
  });
}

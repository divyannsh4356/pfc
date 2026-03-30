import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Repo root: PFC/.env (when you run commands from backend/)
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });
// Optional override: PFC/backend/.env
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

import { createServer } from "http";
import "./loadEnv.js";
import "express-async-errors";
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { seedAdminUser } from "./services/seedAdmin.js";
import { ensureRounds } from "./services/ensureRounds.js";
import { attachSocket } from "./socket/socketHub.js";

const app = express();
const port = Number(process.env.PORT || 3001);

// Swagger setup
const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "PFC API",
    version: "1.0.0",
    description: "API documentation for PFC backend.",
  },
  servers: [
    {
      url: `http://localhost:${port}/api`,
    },
  ],
};
const swaggerOptions = {
  swaggerDefinition,
  apis: [
    "./src/routes/*.js",
    "./src/routes/admin/*.js"
  ],
};
const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required");
}

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
  })
);
app.use(express.json());


app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Not found", code: "NOT_FOUND" });
});

app.use(errorHandler);

async function bootstrap() {
  await seedAdminUser();
  await ensureRounds();
  const httpServer = createServer(app);
  attachSocket(httpServer);
  httpServer.listen(port, () => {
    console.log(`Backend running on port ${port}`);
  });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});

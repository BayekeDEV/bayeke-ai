import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { sessionMiddleware } from "./middleware/session.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chats.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.join(__dirname, "..", "..", "frontend");

export function createApp() {
  const app = express();

  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(sessionMiddleware);
  app.use(express.static(frontendDir));

  app.use("/api", healthRoutes);
  app.use("/api", authRoutes);
  app.use("/api", chatRoutes);

  app.get("/", (req, res) => {
    res.sendFile(path.join(frontendDir, "index.html"));
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

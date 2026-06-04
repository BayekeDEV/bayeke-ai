import { Router } from "express";
import { getDbMode } from "../db/index.js";
import { isApiKeyConfigured } from "../config.js";
import { optionalAuth } from "../middleware/auth.js";

const router = Router();

router.get("/health", optionalAuth, (req, res) => {
  res.json({
    ok: true,
    name: "Байеке ИИ",
    database: getDbMode(),
    gemini: isApiKeyConfigured() ? "configured" : "missing",
    auth: getDbMode() === "mongodb",
    user: req.userId
      ? { id: req.userId, email: req.userEmail, name: req.userName }
      : null,
  });
});

export default router;

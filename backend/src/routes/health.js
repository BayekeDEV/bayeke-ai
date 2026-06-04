import { Router } from "express";
import { getDbMode } from "../db/index.js";
import { isAiConfigured, isGeminiConfigured, isGroqConfigured } from "../config.js";
import { optionalAuth } from "../middleware/auth.js";
import { checkAiConnection, getActiveProvider } from "../services/ai.js";
import { formatQuotaHelp } from "../services/gemini.js";

const router = Router();

router.get("/health", optionalAuth, async (req, res) => {
  const provider = getActiveProvider();

  const payload = {
    ok: true,
    name: "Байеке ИИ",
    database: getDbMode(),
    ai: isAiConfigured() ? "configured" : "missing",
    aiProvider: provider,
    gemini: isGeminiConfigured() ? "configured" : "missing",
    groq: isGroqConfigured() ? "configured" : "missing",
    auth: getDbMode() === "mongodb",
    user: req.userId
      ? { id: req.userId, email: req.userEmail, name: req.userName }
      : null,
  };

  if (req.query.check === "ai" && isAiConfigured()) {
    const result = await checkAiConnection();
    payload.aiCheck = {
      ok: result.ok,
      provider: result.provider ?? null,
      model: result.model ?? null,
      reason: result.reason ?? null,
      help:
        result.reason === "quota" && result.error
          ? formatQuotaHelp(result.error)
          : null,
    };
    if (!result.ok) payload.ok = false;
  }

  res.json(payload);
});

export default router;

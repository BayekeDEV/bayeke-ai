import {
  AI_PROVIDER,
  isAiConfigured,
  isGeminiConfigured,
  isGroqConfigured,
} from "../config.js";
import * as gemini from "./gemini.js";
import * as groq from "./groq.js";
import { isQuotaError } from "./gemini.js";

export function getActiveProvider() {
  if (AI_PROVIDER === "groq" && isGroqConfigured()) return "groq";
  if (AI_PROVIDER === "gemini" && isGeminiConfigured()) return "gemini";
  if (AI_PROVIDER === "auto") {
    if (isGroqConfigured()) return "groq";
    if (isGeminiConfigured()) return "gemini";
  }
  if (isGroqConfigured()) return "groq";
  if (isGeminiConfigured()) return "gemini";
  return null;
}

export async function checkAiConnection() {
  const provider = getActiveProvider();
  if (!provider) {
    return { ok: false, reason: "missing_key", provider: null };
  }

  if (provider === "groq") {
    return { ...(await groq.checkGroqConnection()), provider: "groq" };
  }

  return { ...(await gemini.checkGeminiConnection()), provider: "gemini" };
}

export async function generateReply(message, history = [], image = null) {
  const provider = getActiveProvider();
  if (!provider) {
    const err = new Error("API_KEY_MISSING");
    err.code = "API_KEY_MISSING";
    throw err;
  }

  if (provider === "groq") {
    return groq.generateReply(message, history, image);
  }

  try {
    return await gemini.generateReply(message, history, image);
  } catch (err) {
    if (isGroqConfigured() && isQuotaError(err)) {
      return groq.generateReply(message, history, image);
    }
    throw err;
  }
}

export function buildAiClientError(err, provider = getActiveProvider()) {
  if (provider === "groq") {
    return groq.buildGroqClientError(err);
  }
  return gemini.buildGeminiClientError(err);
}

export { isAiConfigured };

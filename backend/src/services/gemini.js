import { GoogleGenAI } from "@google/genai";
import {
  GEMINI_API_KEY,
  GEMINI_MODEL,
  SYSTEM_INSTRUCTION,
  isApiKeyConfigured,
} from "../config.js";

function mapHistoryToContents(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter(
      (item) =>
        item &&
        typeof item.content === "string" &&
        item.content.trim() &&
        (item.role === "user" || item.role === "assistant")
    )
    .map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.content.trim() }],
    }));
}

function getErrorStatus(err) {
  const status =
    err?.status ??
    err?.statusCode ??
    err?.error?.code ??
    err?.response?.status;
  return typeof status === "number" ? status : null;
}

export function buildGeminiClientError(err) {
  const status = getErrorStatus(err);
  const message = (err?.message || String(err)).toLowerCase();

  if (
    status === 401 ||
    status === 403 ||
    message.includes("api key") ||
    message.includes("api_key") ||
    message.includes("invalid key") ||
    message.includes("permission denied")
  ) {
    return {
      httpStatus: 401,
      body: {
        error:
          "Gemini API кілті жарамсыз. backend/.env файлындағы GEMINI_API_KEY тексеріңіз.",
      },
    };
  }

  if (status === 429 || message.includes("quota") || message.includes("rate")) {
    return {
      httpStatus: 429,
      body: {
        error: "Лимит асып кетті. Біраздан кейін қайта көріңіз.",
      },
    };
  }

  return {
    httpStatus: 500,
    body: {
      error: "ИИ қызметінен жауап алу сәтсіз аяқталды.",
      details: err?.message || "Unknown error",
    },
  };
}

export async function generateReply(message, history = []) {
  if (!isApiKeyConfigured()) {
    const err = new Error("API_KEY_MISSING");
    err.code = "API_KEY_MISSING";
    throw err;
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const contents = [
    ...mapHistoryToContents(history),
    { role: "user", parts: [{ text: message.trim() }] },
  ];

  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config: { systemInstruction: SYSTEM_INSTRUCTION },
      });

      const reply = response?.text?.trim();
      if (!reply) {
        const err = new Error("EMPTY_RESPONSE");
        err.code = "EMPTY_RESPONSE";
        throw err;
      }

      return reply;
    } catch (err) {
      lastErr = err;
      const status = getErrorStatus(err);
      if (status === 401 || status === 403 || status === 429) throw err;
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, attempt * 800));
      }
    }
  }

  throw lastErr;
}

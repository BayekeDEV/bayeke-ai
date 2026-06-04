import { GoogleGenAI } from "@google/genai";
import {
  GEMINI_API_KEY,
  GEMINI_MODEL,
  GEMINI_FALLBACK_MODEL,
  SYSTEM_INSTRUCTION,
  isApiKeyConfigured,
} from "../config.js";

const IMAGE_PLACEHOLDER = "[Сурет]";

function buildParts(text, image) {
  const parts = [];

  if (image?.data && image?.mimeType) {
    parts.push({
      inlineData: { mimeType: image.mimeType, data: image.data },
    });
  }

  const trimmed = typeof text === "string" ? text.trim() : "";
  if (trimmed && trimmed !== IMAGE_PLACEHOLDER) {
    parts.push({ text: trimmed });
  } else if (image?.data) {
    parts.push({ text: "Бұл суретті сипатта." });
  }

  return parts;
}

function mapHistoryToContents(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter(
      (item) =>
        item &&
        item.role &&
        (item.role === "user" || item.role === "assistant") &&
        ((typeof item.content === "string" && item.content.trim()) ||
          item.image?.data)
    )
    .map((item) => {
      const parts = buildParts(item.content, item.image);
      if (!parts.length) return null;
      return {
        role: item.role === "assistant" ? "model" : "user",
        parts,
      };
    })
    .filter(Boolean);
}

function getErrorStatus(err) {
  const status =
    err?.status ??
    err?.statusCode ??
    err?.error?.code ??
    err?.response?.status;
  return typeof status === "number" ? status : null;
}

function isQuotaError(err) {
  const status = getErrorStatus(err);
  if (status === 429) return true;
  const message = (err?.message || String(err)).toLowerCase();
  return (
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("rate_limit") ||
    message.includes("too many requests") ||
    message.includes("resource exhausted") ||
    message.includes("resource_exhausted")
  );
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

  if (isQuotaError(err)) {
    return {
      httpStatus: 429,
      body: {
        error:
          "Google Gemini тегін лимиті аяқталды. 1–2 минут күтіңіз немесе aistudio.google.com/apikey сайтында жаңа кілт алыңыз. Render + жергілікті бір кілтпен жұмыс істесе лимит тез бітеді.",
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

export async function generateReply(message, history = [], image = null) {
  if (!isApiKeyConfigured()) {
    const err = new Error("API_KEY_MISSING");
    err.code = "API_KEY_MISSING";
    throw err;
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const userParts = buildParts(message, image);
  if (!userParts.length) {
    const err = new Error("EMPTY_INPUT");
    err.code = "EMPTY_INPUT";
    throw err;
  }

  const contents = [
    ...mapHistoryToContents(history),
    { role: "user", parts: userParts },
  ];

  const models = [GEMINI_MODEL];
  if (GEMINI_FALLBACK_MODEL && GEMINI_FALLBACK_MODEL !== GEMINI_MODEL) {
    models.push(GEMINI_FALLBACK_MODEL);
  }

  let lastErr;
  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
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
        if (status === 401 || status === 403) throw err;
        if (isQuotaError(err)) break;
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, attempt * 800));
        }
      }
    }
  }

  throw lastErr;
}

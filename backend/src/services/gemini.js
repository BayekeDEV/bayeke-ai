import { GoogleGenAI } from "@google/genai";
import {
  GEMINI_API_KEY,
  GEMINI_MODEL,
  GEMINI_FALLBACK_MODEL,
  SYSTEM_INSTRUCTION,
  isApiKeyConfigured,
} from "../config.js";

const IMAGE_PLACEHOLDER = "[Сурет]";
const MAX_HISTORY_MESSAGES = 12;

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

function trimHistory(history) {
  if (!Array.isArray(history)) return [];

  return history.slice(-MAX_HISTORY_MESSAGES).map((item) => {
    if (!item?.image?.data) return item;
    return {
      role: item.role,
      content: item.content,
    };
  });
}

function mapHistoryToContents(history) {
  return trimHistory(history)
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

function getErrorMessage(err) {
  return (err?.message || String(err)).toLowerCase();
}

function isQuotaError(err) {
  const status = getErrorStatus(err);
  if (status === 429) return true;
  const message = getErrorMessage(err);
  return (
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("rate_limit") ||
    message.includes("too many requests") ||
    message.includes("resource exhausted") ||
    message.includes("resource_exhausted")
  );
}

function isZeroQuotaError(err) {
  const message = getErrorMessage(err);
  return message.includes("limit: 0") || message.includes("limit:0");
}

export { isQuotaError };

export function formatQuotaHelp(err) {
  if (isZeroQuotaError(err)) {
    return (
      "Google аккаунтыңызда тегін Gemini квотасы жоқ (limit: 0). " +
      "Groq қолданыңыз: console.groq.com/keys → GROQ_API_KEY, .env-ке AI_PROVIDER=groq"
    );
  }

  return (
    "Gemini API лимиті аяқталды. 1–2 минут күтіңіз. " +
    "Render + localhost бір кілтпен жұмыс істемесin."
  );
}

export function buildGeminiClientError(err) {
  const status = getErrorStatus(err);
  const message = getErrorMessage(err);

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
          "Gemini API кілті жарамсыз. aistudio.google.com/apikey сайтынан AIzaSy... кілт алыңыз.",
      },
    };
  }

  if (isQuotaError(err)) {
    return {
      httpStatus: 429,
      body: {
        error: formatQuotaHelp(err),
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

async function callModel(ai, model, contents) {
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
}

export async function checkGeminiConnection() {
  if (!isApiKeyConfigured()) {
    return { ok: false, reason: "missing_key" };
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const models = [GEMINI_MODEL, GEMINI_FALLBACK_MODEL].filter(
    (m, i, arr) => m && arr.indexOf(m) === i
  );

  for (const model of models) {
    try {
      await callModel(ai, model, [
        { role: "user", parts: [{ text: "ping" }] },
      ]);
      return { ok: true, model };
    } catch (err) {
      if (getErrorStatus(err) === 401 || getErrorStatus(err) === 403) {
        return { ok: false, reason: "invalid_key", model, error: err };
      }
      if (isQuotaError(err)) {
        return { ok: false, reason: "quota", model, error: err };
      }
    }
  }

  return { ok: false, reason: "unavailable" };
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

  const models = [GEMINI_MODEL, GEMINI_FALLBACK_MODEL].filter(
    (m, i, arr) => m && arr.indexOf(m) === i
  );

  let lastErr;
  for (const model of models) {
    try {
      return await callModel(ai, model, contents);
    } catch (err) {
      lastErr = err;
      const status = getErrorStatus(err);
      if (status === 401 || status === 403) throw err;
      if (!isQuotaError(err)) throw err;
    }
  }

  throw lastErr;
}

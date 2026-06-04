import {
  GROQ_API_KEY,
  GROQ_MODEL,
  GROQ_VISION_MODEL,
  SYSTEM_INSTRUCTION,
  isGroqConfigured,
} from "../config.js";

const IMAGE_PLACEHOLDER = "[Сурет]";
const MAX_HISTORY_MESSAGES = 12;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

function trimHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-MAX_HISTORY_MESSAGES).map((item) => {
    if (!item?.image?.data) return item;
    return { role: item.role, content: item.content };
  });
}

function buildUserContent(text, image) {
  const parts = [];
  const trimmed = typeof text === "string" ? text.trim() : "";

  if (image?.data && image?.mimeType) {
    parts.push({
      type: "image_url",
      image_url: {
        url: `data:${image.mimeType};base64,${image.data}`,
      },
    });
  }

  if (trimmed && trimmed !== IMAGE_PLACEHOLDER) {
    parts.push({ type: "text", text: trimmed });
  } else if (image?.data) {
    parts.push({ type: "text", text: "Бұл суретті сипатта." });
  }

  return parts.length === 1 && parts[0].type === "text"
    ? parts[0].text
    : parts;
}

function mapHistoryToMessages(history) {
  return trimHistory(history)
    .filter(
      (item) =>
        item &&
        item.role &&
        (item.role === "user" || item.role === "assistant") &&
        ((typeof item.content === "string" && item.content.trim()) ||
          item.image?.data)
    )
    .map((item) => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: buildUserContent(item.content, item.image),
    }));
}

function getErrorStatus(err) {
  return typeof err?.status === "number" ? err.status : null;
}

export function buildGroqClientError(err) {
  const status = getErrorStatus(err);
  const message = (err?.message || String(err)).toLowerCase();

  if (status === 401 || status === 403) {
    return {
      httpStatus: 401,
      body: {
        error:
          "Groq API кілті жарамсыз. console.groq.com/keys сайтынан GROQ_API_KEY алыңыз.",
      },
    };
  }

  if (status === 429 || message.includes("rate limit")) {
    return {
      httpStatus: 429,
      body: {
        error: "Groq лимиті аяқталды. 1 минут күтіңіз.",
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

async function callGroq(messages, model) {
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(
      data?.error?.message || `Groq API ${response.status}`
    );
    err.status = response.status;
    throw err;
  }

  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    const err = new Error("EMPTY_RESPONSE");
    err.code = "EMPTY_RESPONSE";
    throw err;
  }

  return reply;
}

export async function checkGroqConnection() {
  if (!isGroqConfigured()) {
    return { ok: false, reason: "missing_key" };
  }

  try {
    await callGroq(
      [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: "ping" },
      ],
      GROQ_MODEL
    );
    return { ok: true, model: GROQ_MODEL, provider: "groq" };
  } catch (err) {
    const status = getErrorStatus(err);
    if (status === 401 || status === 403) {
      return { ok: false, reason: "invalid_key", error: err, provider: "groq" };
    }
    if (status === 429) {
      return { ok: false, reason: "quota", error: err, provider: "groq" };
    }
    return { ok: false, reason: "unavailable", error: err, provider: "groq" };
  }
}

export async function generateReply(message, history = [], image = null) {
  if (!isGroqConfigured()) {
    const err = new Error("API_KEY_MISSING");
    err.code = "API_KEY_MISSING";
    throw err;
  }

  const userContent = buildUserContent(message, image);
  if (
    !userContent ||
    (Array.isArray(userContent) && userContent.length === 0)
  ) {
    const err = new Error("EMPTY_INPUT");
    err.code = "EMPTY_INPUT";
    throw err;
  }

  const messages = [
    { role: "system", content: SYSTEM_INSTRUCTION },
    ...mapHistoryToMessages(history),
    { role: "user", content: userContent },
  ];

  const model =
    image?.data && GROQ_VISION_MODEL ? GROQ_VISION_MODEL : GROQ_MODEL;

  return callGroq(messages, model);
}

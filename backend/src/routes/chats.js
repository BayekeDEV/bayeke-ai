import { Router } from "express";

import {
  listChats,
  createChat,
  getChat,
  updateChatTitle,
  deleteChat,
  addMessage,
} from "../db/index.js";
import { generateReply, buildGeminiClientError } from "../services/gemini.js";
import { isApiKeyConfigured } from "../config.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_PLACEHOLDER = "[Сурет]";

function truncateTitle(text, max = 48) {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}…`;
}

function normalizeImage(raw) {
  if (!raw || typeof raw !== "object") return null;

  const mimeType =
    typeof raw.mimeType === "string" ? raw.mimeType.trim().toLowerCase() : "";
  let data = typeof raw.data === "string" ? raw.data.trim() : "";

  if (!mimeType || !data) return null;
  if (!ALLOWED_IMAGE_TYPES.has(mimeType)) return null;

  data = data.replace(/^data:[^;]+;base64,/, "");
  const size = Buffer.from(data, "base64").length;
  if (size === 0 || size > MAX_IMAGE_BYTES) return null;

  return { mimeType, data };
}

router.get("/chats", async (req, res, next) => {
  try {
    const chats = await listChats(req.userId);
    res.json({ chats });
  } catch (err) {
    next(err);
  }
});

router.post("/chats", async (req, res, next) => {
  try {
    const title =
      typeof req.body?.title === "string" && req.body.title.trim()
        ? req.body.title.trim()
        : "Жаңа сөйлесу";
    const chat = await createChat(req.userId, title);
    res.status(201).json({ chat });
  } catch (err) {
    next(err);
  }
});

router.get("/chats/:id", async (req, res, next) => {
  try {
    const chat = await getChat(req.userId, req.params.id);
    if (!chat) {
      return res.status(404).json({ error: "Чат табылмады" });
    }
    res.json({ chat });
  } catch (err) {
    next(err);
  }
});

router.patch("/chats/:id", async (req, res, next) => {
  try {
    const title = req.body?.title;
    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Тақырып міндетті" });
    }
    const chat = await updateChatTitle(
      req.userId,
      req.params.id,
      title.trim()
    );
    if (!chat) {
      return res.status(404).json({ error: "Чат табылмады" });
    }
    res.json({ chat });
  } catch (err) {
    next(err);
  }
});

router.delete("/chats/:id", async (req, res, next) => {
  try {
    const deleted = await deleteChat(req.userId, req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Чат табылмады" });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/chats/:id/messages", async (req, res, next) => {
  try {
    if (!isApiKeyConfigured()) {
      return res.status(500).json({
        error:
          "GEMINI_API_KEY орнатылмаған. backend/.env файлында кілтті қойыңыз.",
      });
    }

    const rawMessage =
      typeof req.body?.message === "string" ? req.body.message.trim() : "";
    const image = normalizeImage(req.body?.image);

    if (!rawMessage && !image) {
      return res.status(400).json({ error: "Хабарлама немесе сурет керек" });
    }

    if (req.body?.image && !image) {
      return res.status(400).json({
        error:
          "Сурет жарамсыз. JPEG, PNG, WebP немесе GIF, максимум 4 МБ болуы керек.",
      });
    }

    const chatId = req.params.id;
    const existing = await getChat(req.userId, chatId);
    if (!existing) {
      return res.status(404).json({ error: "Чат табылмады" });
    }

    const storedContent = rawMessage || IMAGE_PLACEHOLDER;
    const history = (existing.messages ?? []).map((m) => ({
      role: m.role,
      content: m.content,
      image: m.image ?? null,
    }));

    await addMessage(req.userId, chatId, "user", storedContent, image);

    if (existing.title === "Жаңа сөйлесу" || !existing.title?.trim()) {
      const titleSource = rawMessage || "Сурет";
      await updateChatTitle(req.userId, chatId, truncateTitle(titleSource));
    }

    let replyText;
    try {
      replyText = await generateReply(rawMessage, history, image);
    } catch (err) {
      if (err.code === "API_KEY_MISSING") {
        return res.status(500).json({ error: "GEMINI_API_KEY орнатылмаған." });
      }
      if (err.code === "EMPTY_RESPONSE") {
        return res.status(502).json({ error: "Модель бос жауап қайтарды." });
      }
      const { httpStatus, body } = buildGeminiClientError(err);
      return res.status(httpStatus).json(body);
    }

    const assistantMessage = await addMessage(
      req.userId,
      chatId,
      "assistant",
      replyText
    );

    const chat = await getChat(req.userId, chatId);

    res.json({
      assistantMessage,
      reply: replyText,
      chat,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

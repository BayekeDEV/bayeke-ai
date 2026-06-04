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



function truncateTitle(text, max = 48) {

  const oneLine = text.replace(/\s+/g, " ").trim();

  if (oneLine.length <= max) return oneLine;

  return `${oneLine.slice(0, max - 1)}…`;

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



    const message = req.body?.message;

    if (!message || typeof message !== "string" || !message.trim()) {

      return res.status(400).json({ error: "Хабарлама міндетті" });

    }



    const chatId = req.params.id;

    const existing = await getChat(req.userId, chatId);

    if (!existing) {

      return res.status(404).json({ error: "Чат табылмады" });

    }



    const trimmed = message.trim();

    const history = (existing.messages ?? []).map((m) => ({

      role: m.role,

      content: m.content,

    }));



    await addMessage(req.userId, chatId, "user", trimmed);



    if (existing.title === "Жаңа сөйлесу" || !existing.title?.trim()) {

      await updateChatTitle(req.userId, chatId, truncateTitle(trimmed));

    }



    let replyText;

    try {

      replyText = await generateReply(trimmed, history);

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



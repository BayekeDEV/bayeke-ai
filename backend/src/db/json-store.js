import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "..", "data");
const DATA_FILE = path.join(DATA_DIR, "bayeke.json");

const emptyDb = () => ({ chats: [], messages: [] });

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(emptyDb(), null, 2), "utf8");
  }
}

async function readDb() {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  const data = JSON.parse(raw);
  return {
    chats: Array.isArray(data.chats) ? data.chats : [],
    messages: Array.isArray(data.messages) ? data.messages : [],
  };
}

async function writeDb(data) {
  await ensureFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

export async function initJsonStore() {
  await ensureFile();
  return { mode: "json" };
}

export async function listChats(sessionId) {
  const db = await readDb();
  return db.chats
    .filter((c) => c.session_id === sessionId)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));
}

export async function createChat(sessionId, title = "Жаңа сөйлесу") {
  const db = await readDb();
  const now = new Date().toISOString();
  const chat = {
    id: randomUUID(),
    session_id: sessionId,
    title,
    created_at: now,
    updated_at: now,
  };
  db.chats.unshift(chat);
  await writeDb(db);
  return {
    id: chat.id,
    title: chat.title,
    createdAt: chat.created_at,
    updatedAt: chat.updated_at,
  };
}

export async function getChat(sessionId, chatId) {
  const db = await readDb();
  const chat = db.chats.find(
    (c) => c.id === chatId && c.session_id === sessionId
  );
  if (!chat) return null;

  const messages = db.messages
    .filter((m) => m.chat_id === chatId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map((m) => {
      const msg = {
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.created_at,
      };
      if (m.image_mime && m.image_data) {
        msg.image = { mimeType: m.image_mime, data: m.image_data };
      }
      return msg;
    });

  return {
    id: chat.id,
    title: chat.title,
    createdAt: chat.created_at,
    updatedAt: chat.updated_at,
    messages,
  };
}

export async function updateChatTitle(sessionId, chatId, title) {
  const db = await readDb();
  const chat = db.chats.find(
    (c) => c.id === chatId && c.session_id === sessionId
  );
  if (!chat) return null;
  chat.title = title;
  chat.updated_at = new Date().toISOString();
  await writeDb(db);
  return { id: chat.id, title: chat.title, updatedAt: chat.updated_at };
}

export async function deleteChat(sessionId, chatId) {
  const db = await readDb();
  const before = db.chats.length;
  db.chats = db.chats.filter(
    (c) => !(c.id === chatId && c.session_id === sessionId)
  );
  db.messages = db.messages.filter((m) => m.chat_id !== chatId);
  await writeDb(db);
  return db.chats.length < before;
}

export async function addMessage(sessionId, chatId, role, content, image = null) {
  const db = await readDb();
  const chat = db.chats.find(
    (c) => c.id === chatId && c.session_id === sessionId
  );
  if (!chat) return null;

  const now = new Date().toISOString();
  const message = {
    id: randomUUID(),
    chat_id: chatId,
    role,
    content,
    created_at: now,
  };
  if (image?.mimeType && image?.data) {
    message.image_mime = image.mimeType;
    message.image_data = image.data;
  }
  db.messages.push(message);
  chat.updated_at = now;
  await writeDb(db);

  const saved = {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.created_at,
  };
  if (message.image_mime && message.image_data) {
    saved.image = { mimeType: message.image_mime, data: message.image_data };
  }
  return saved;
}

export async function getMessagesForChat(sessionId, chatId) {
  const chat = await getChat(sessionId, chatId);
  return chat?.messages ?? null;
}

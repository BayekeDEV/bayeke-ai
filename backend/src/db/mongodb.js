import { MongoClient, ObjectId } from "mongodb";
import { DATABASE_URL } from "../config.js";

let client;
let db;

function users() {
  return db.collection("users");
}

function chatsCol() {
  return db.collection("chats");
}

function messagesCol() {
  return db.collection("messages");
}

function toId(value) {
  if (!ObjectId.isValid(value)) return null;
  return new ObjectId(value);
}

function mapChat(doc) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
  };
}

function mapMessage(doc) {
  const msg = {
    id: doc._id.toString(),
    role: doc.role,
    content: doc.content,
    createdAt: doc.created_at,
  };
  if (doc.image_mime && doc.image_data) {
    msg.image = { mimeType: doc.image_mime, data: doc.image_data };
  }
  return msg;
}

function buildMongoUri() {
  const user = process.env.MONGODB_USER?.trim();
  const pass = process.env.MONGODB_PASSWORD?.trim();
  const host =
    process.env.MONGODB_HOST?.trim() || "cluster0.60pyelx.mongodb.net";
  const dbName = process.env.MONGODB_DB_NAME?.trim() || "bayeke";

  if (user && pass) {
    return `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}/${dbName}?retryWrites=true&w=majority&authSource=admin`;
  }

  let url = DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL немесе MONGODB_USER/PASSWORD қойылмаған");

  if (url.includes("<") || url.includes(">")) {
    throw new Error("DATABASE_URL-де <db_username> placeholder қалған — нақты пароль қойыңыз");
  }

  if (!url.includes("authSource=")) {
    url += url.includes("?") ? "&authSource=admin" : "?authSource=admin";
  }
  return url;
}

function resolveDbName(url) {
  const match = url.match(/\.mongodb\.net\/([^/?]+)/);
  if (match?.[1]) return match[1];
  return process.env.MONGODB_DB_NAME || "bayeke";
}

export async function initMongo() {
  const uri = buildMongoUri();
  client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  });
  await client.connect();
  const dbName = resolveDbName(uri);
  db = client.db(dbName);
  console.log(`  MongoDB база: ${dbName}`);

  try {
    await users().createIndex({ email: 1 }, { unique: true });
    await chatsCol().createIndex({ user_id: 1, updated_at: -1 });
    await messagesCol().createIndex({ chat_id: 1, created_at: 1 });
  } catch (err) {
    console.warn("⚠ Index creation:", err.message);
    console.warn("  Atlas user-ге readWrite рұқсаты керек");
  }

  return { mode: "mongodb" };
}

export async function closeMongo() {
  if (client) await client.close();
}

// ——— Users ———

export async function createUser({ email, passwordHash, name }) {
  const now = new Date().toISOString();
  const doc = {
    email: email.toLowerCase().trim(),
    password_hash: passwordHash,
    name: name?.trim() || email.split("@")[0],
    created_at: now,
  };
  const result = await users().insertOne(doc);
  return {
    id: result.insertedId.toString(),
    email: doc.email,
    name: doc.name,
    createdAt: doc.created_at,
  };
}

export async function findUserByEmail(email) {
  const doc = await users().findOne({ email: email.toLowerCase().trim() });
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name,
    passwordHash: doc.password_hash,
    createdAt: doc.created_at,
  };
}

export async function findUserById(userId) {
  const oid = toId(userId);
  if (!oid) return null;
  const doc = await users().findOne({ _id: oid });
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name,
    createdAt: doc.created_at,
  };
}

// ——— Chats ———

export async function listChats(userId) {
  const rows = await chatsCol()
    .find({ user_id: userId })
    .sort({ updated_at: -1 })
    .toArray();
  return rows.map(mapChat);
}

export async function createChat(userId, title = "Жаңа сөйлесу") {
  const now = new Date().toISOString();
  const doc = {
    user_id: userId,
    title,
    created_at: now,
    updated_at: now,
  };
  const result = await chatsCol().insertOne(doc);
  return {
    id: result.insertedId.toString(),
    title: doc.title,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
  };
}

export async function getChat(userId, chatId) {
  const oid = toId(chatId);
  if (!oid) return null;

  const chat = await chatsCol().findOne({ _id: oid, user_id: userId });
  if (!chat) return null;

  const messages = await messagesCol()
    .find({ chat_id: chatId })
    .sort({ created_at: 1 })
    .toArray();

  return {
    ...mapChat(chat),
    messages: messages.map(mapMessage),
  };
}

export async function updateChatTitle(userId, chatId, title) {
  const oid = toId(chatId);
  if (!oid) return null;

  const now = new Date().toISOString();
  const result = await chatsCol().findOneAndUpdate(
    { _id: oid, user_id: userId },
    { $set: { title, updated_at: now } },
    { returnDocument: "after" }
  );

  if (!result) return null;
  return mapChat(result);
}

export async function deleteChat(userId, chatId) {
  const oid = toId(chatId);
  if (!oid) return false;

  const result = await chatsCol().deleteOne({ _id: oid, user_id: userId });
  if (result.deletedCount === 0) return false;

  await messagesCol().deleteMany({ chat_id: chatId });
  return true;
}

export async function addMessage(userId, chatId, role, content, image = null) {
  const oid = toId(chatId);
  if (!oid) return null;

  const chat = await chatsCol().findOne({ _id: oid, user_id: userId });
  if (!chat) return null;

  const now = new Date().toISOString();
  const doc = {
    chat_id: chatId,
    user_id: userId,
    role,
    content,
    created_at: now,
  };
  if (image?.mimeType && image?.data) {
    doc.image_mime = image.mimeType;
    doc.image_data = image.data;
  }
  const result = await messagesCol().insertOne(doc);

  await chatsCol().updateOne(
    { _id: oid },
    { $set: { updated_at: now } }
  );

  const saved = {
    id: result.insertedId.toString(),
    role: doc.role,
    content: doc.content,
    createdAt: doc.created_at,
  };
  if (doc.image_mime && doc.image_data) {
    saved.image = { mimeType: doc.image_mime, data: doc.image_data };
  }
  return saved;
}

export async function getMessagesForChat(userId, chatId) {
  const chat = await getChat(userId, chatId);
  return chat?.messages ?? null;
}

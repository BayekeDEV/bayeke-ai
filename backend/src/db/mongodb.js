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
  return {
    id: doc._id.toString(),
    role: doc.role,
    content: doc.content,
    createdAt: doc.created_at,
  };
}

export async function initMongo() {
  client = new MongoClient(DATABASE_URL);
  await client.connect();
  db = client.db();

  await users().createIndex({ email: 1 }, { unique: true });
  await chatsCol().createIndex({ user_id: 1, updated_at: -1 });
  await messagesCol().createIndex({ chat_id: 1, created_at: 1 });

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

export async function addMessage(userId, chatId, role, content) {
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
  const result = await messagesCol().insertOne(doc);

  await chatsCol().updateOne(
    { _id: oid },
    { $set: { updated_at: now } }
  );

  return {
    id: result.insertedId.toString(),
    role: doc.role,
    content: doc.content,
    createdAt: doc.created_at,
  };
}

export async function getMessagesForChat(userId, chatId) {
  const chat = await getChat(userId, chatId);
  return chat?.messages ?? null;
}

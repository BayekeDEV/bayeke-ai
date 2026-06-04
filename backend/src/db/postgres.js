import pg from "pg";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { DATABASE_URL } from "../config.js";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function initPostgres() {
  const client = await getPool().connect();
  try {
    const schemaPath = path.join(__dirname, "schema.sql");
    const schema = await fs.readFile(schemaPath, "utf8");
    await client.query(schema);
    return { mode: "postgres" };
  } finally {
    client.release();
  }
}

export async function listChats(sessionId) {
  const { rows } = await getPool().query(
    `SELECT id, title, created_at AS "createdAt", updated_at AS "updatedAt"
     FROM chats WHERE session_id = $1
     ORDER BY updated_at DESC`,
    [sessionId]
  );
  return rows;
}

export async function createChat(sessionId, title = "Жаңа сөйлесу") {
  const { rows } = await getPool().query(
    `INSERT INTO chats (session_id, title)
     VALUES ($1, $2)
     RETURNING id, title, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [sessionId, title]
  );
  return rows[0];
}

export async function getChat(sessionId, chatId) {
  const chatResult = await getPool().query(
    `SELECT id, title, created_at AS "createdAt", updated_at AS "updatedAt"
     FROM chats WHERE id = $1 AND session_id = $2`,
    [chatId, sessionId]
  );
  if (!chatResult.rows[0]) return null;

  const messagesResult = await getPool().query(
    `SELECT id, role, content, created_at AS "createdAt"
     FROM messages WHERE chat_id = $1
     ORDER BY created_at ASC`,
    [chatId]
  );

  return { ...chatResult.rows[0], messages: messagesResult.rows };
}

export async function updateChatTitle(sessionId, chatId, title) {
  const { rows } = await getPool().query(
    `UPDATE chats SET title = $1, updated_at = NOW()
     WHERE id = $2 AND session_id = $3
     RETURNING id, title, updated_at AS "updatedAt"`,
    [title, chatId, sessionId]
  );
  return rows[0] ?? null;
}

export async function deleteChat(sessionId, chatId) {
  const { rowCount } = await getPool().query(
    `DELETE FROM chats WHERE id = $1 AND session_id = $2`,
    [chatId, sessionId]
  );
  return rowCount > 0;
}

export async function addMessage(sessionId, chatId, role, content) {
  const chatCheck = await getPool().query(
    `SELECT id FROM chats WHERE id = $1 AND session_id = $2`,
    [chatId, sessionId]
  );
  if (!chatCheck.rows[0]) return null;

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO messages (chat_id, role, content)
       VALUES ($1, $2, $3)
       RETURNING id, role, content, created_at AS "createdAt"`,
      [chatId, role, content]
    );
    await client.query(
      `UPDATE chats SET updated_at = NOW() WHERE id = $1`,
      [chatId]
    );
    await client.query("COMMIT");
    return rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getMessagesForChat(sessionId, chatId) {
  const chat = await getChat(sessionId, chatId);
  return chat?.messages ?? null;
}

export async function closePostgres() {
  if (pool) await pool.end();
}

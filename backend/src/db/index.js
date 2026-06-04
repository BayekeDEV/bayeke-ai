import { DATABASE_URL } from "../config.js";

import * as postgres from "./postgres.js";

import * as jsonStore from "./json-store.js";

import * as mongo from "./mongodb.js";



let store = null;

let dbMode = "json";



function isPostgresUrl(url) {

  return url.startsWith("postgres://") || url.startsWith("postgresql://");

}



function isMongoUrl(url) {

  return url.startsWith("mongodb://") || url.startsWith("mongodb+srv://");

}



async function useJsonStore() {

  const result = await jsonStore.initJsonStore();

  store = jsonStore;

  dbMode = result.mode;

  console.log("✓ База: жергілікті JSON (backend/data/bayeke.json)");

  console.log("  MongoDB: DATABASE_URL=mongodb://localhost:27017/bayeke");

  return { mode: dbMode };

}



export async function initDatabase() {

  if (DATABASE_URL) {

    if (isMongoUrl(DATABASE_URL)) {

      try {

        const result = await mongo.initMongo();

        store = mongo;

        dbMode = result.mode;

        console.log("✓ База: MongoDB");

        return { mode: dbMode };

      } catch (err) {
        console.error("✗ MongoDB қосылмады:", err.message);
        console.error("  Тексеріңіз: DATABASE_URL, пароль, Atlas Network Access (0.0.0.0/0)");
        throw err;
      }

    }



    if (isPostgresUrl(DATABASE_URL)) {

      try {

        const result = await postgres.initPostgres();

        store = postgres;

        dbMode = result.mode;

        console.log("✓ База: PostgreSQL (DATABASE_URL)");

        return { mode: dbMode };

      } catch (err) {

        console.warn("⚠ PostgreSQL қосылмады:", err.message);

        console.warn("  JSON базаға fallback...");

        return useJsonStore();

      }

    }



    console.warn("⚠ DATABASE_URL танылмады — JSON базаға өтеміз");

    return useJsonStore();

  }



  return useJsonStore();

}



export function getDbMode() {

  return dbMode;

}



export const listChats = (...args) => store.listChats(...args);

export const createChat = (...args) => store.createChat(...args);

export const getChat = (...args) => store.getChat(...args);

export const updateChatTitle = (...args) => store.updateChatTitle(...args);

export const deleteChat = (...args) => store.deleteChat(...args);

export const addMessage = (...args) => store.addMessage(...args);

export const getMessagesForChat = (...args) => store.getMessagesForChat(...args);



export const createUser = (...args) => store.createUser?.(...args);

export const findUserByEmail = (...args) => store.findUserByEmail?.(...args);

export const findUserById = (...args) => store.findUserById?.(...args);



export async function shutdownDatabase() {

  if (dbMode === "postgres") {

    await postgres.closePostgres();

  } else if (dbMode === "mongodb") {

    await mongo.closeMongo();

  }

}



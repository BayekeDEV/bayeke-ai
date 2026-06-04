import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { initPostgres, closePostgres } from "../src/db/postgres.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const url = process.env.DATABASE_URL?.trim();

if (!url) {
  console.log("DATABASE_URL жоқ — JSON режимі (backend/data/bayeke.json) автоматты.");
  console.log("PostgreSQL үшін backend/.env файлына сілтемені қойып, қайта іске қосыңыз.");
  process.exit(0);
}

try {
  await initPostgres();
  console.log("✓ PostgreSQL кестелері дайын.");
} catch (err) {
  console.error("✗ База инициализациясы сәтсіз:", err.message);
  process.exit(1);
} finally {
  await closePostgres();
}

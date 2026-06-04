import { checkGeminiConnection, formatQuotaHelp } from "../src/services/gemini.js";
import { GEMINI_MODEL, isApiKeyConfigured } from "../src/config.js";

console.log("=== Gemini тексеру ===\n");

if (!isApiKeyConfigured()) {
  console.log("ҚАТЕ: GEMINI_API_KEY .env файлында жоқ.");
  process.exit(1);
}

console.log("Модель:", GEMINI_MODEL);
console.log("Кілт: жүктелді (AQ. немесе AIzaSy форматы)\n");

const result = await checkGeminiConnection();

if (result.ok) {
  console.log("OK — Gemini жұмыс істейді:", result.model);
  process.exit(0);
}

if (result.reason === "invalid_key") {
  console.log("ҚАТЕ: Кілт жарамсыз.");
  console.log("→ https://aistudio.google.com/apikey сайтынан жаңа кілт алыңыз.");
  process.exit(1);
}

if (result.reason === "quota") {
  console.log("ҚАТЕ: Google квотасы жоқ / лимит аяқталды.");
  console.log("→", formatQuotaHelp(result.error));
  process.exit(1);
}

console.log("ҚАТЕ: Gemini қолжетімсіз.");
process.exit(1);

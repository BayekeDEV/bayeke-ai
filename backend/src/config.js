import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

export const PORT = Number(process.env.PORT) || 3000;

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim() ?? "";

export const GROQ_API_KEY = process.env.GROQ_API_KEY?.trim() ?? "";

export const AI_PROVIDER = (process.env.AI_PROVIDER?.trim() || "auto").toLowerCase();

export const DATABASE_URL = process.env.DATABASE_URL?.trim() ?? "";
export const JWT_SECRET =
  process.env.JWT_SECRET?.trim() || "bayeke-dev-secret-change-in-production";

export const PLACEHOLDER_KEYS = new Set([
  "",
  "your_gemini_api_key_here",
  "YOUR_GEMINI_API_KEY_HERE",
]);

export function isGeminiConfigured(key = GEMINI_API_KEY) {
  if (!key) return false;
  return key.length > 0 && !PLACEHOLDER_KEYS.has(key);
}

export function isGroqConfigured(key = GROQ_API_KEY) {
  if (!key) return false;
  return key.length > 10 && !PLACEHOLDER_KEYS.has(key);
}

export function isAiConfigured() {
  return isGroqConfigured() || isGeminiConfigured();
}

/** @deprecated use isGeminiConfigured */
export function isApiKeyConfigured(key = GEMINI_API_KEY) {
  return isGeminiConfigured(key);
}
export const SYSTEM_INSTRUCTION = `Сен — «Байеке ИИ», ақылды әрі достық көмекші.
Сен қазақ, орыс тілдерінде және екі тілдің аралас кәдімгі сөйлеу стилінде еркін сөйлей аласың.
Жауаптарың нақты, пайдалы және жылы болсын. Қажет болса, мысалдар мен қадам-қадам түсіндірме бер.
Егер пайдаланушы тілді нақты көрсетпесе, сұрақтың тіліне немесе аралас стильге бейімдел.
Өзіңді «Байеке ИИ» деп таныстыр, бірақ әр жауапта қайталама.`;

export const GEMINI_MODEL =
  process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash-lite";

export const GEMINI_FALLBACK_MODEL =
  process.env.GEMINI_FALLBACK_MODEL?.trim() || "gemini-2.0-flash";

export const GROQ_MODEL =
  process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";

export const GROQ_VISION_MODEL =
  process.env.GROQ_VISION_MODEL?.trim() ||
  "meta-llama/llama-4-scout-17b-16e-instruct";
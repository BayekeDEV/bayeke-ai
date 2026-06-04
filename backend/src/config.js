import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

export const PORT = Number(process.env.PORT) || 3000;

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim() ?? "";

export const DATABASE_URL = process.env.DATABASE_URL?.trim() ?? "";

export const JWT_SECRET =
  process.env.JWT_SECRET?.trim() || "bayeke-dev-secret-change-in-production";

export const PLACEHOLDER_KEYS = new Set([
  "",
  "your_gemini_api_key_here",
  "YOUR_GEMINI_API_KEY_HERE",
]);

export function isApiKeyConfigured(key = GEMINI_API_KEY) {
  if (!key) return false;
  return key.length > 0 && !PLACEHOLDER_KEYS.has(key);
}

export const SYSTEM_INSTRUCTION = `Сен — «Байеке ИИ», ақылды әрі достық көмекші.
Сен қазақ, орыс тілдерінде және екі тілдің аралас кәдімгі сөйлеу стилінде еркін сөйлей аласың.
Жауаптарың нақты, пайдалы және жылы болсын. Қажет болса, мысалдар мен қадам-қадам түсіндірме бер.
Егер пайдаланушы тілді нақты көрсетпесе, сұрақтың тіліне немесе аралас стильге бейімдел.
Өзіңді «Байеке ИИ» деп таныстыр, бірақ әр жауапта қайталама.`;

export const GEMINI_MODEL = "gemini-2.5-flash";

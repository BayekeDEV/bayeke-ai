import { checkAiConnection, getActiveProvider } from "../src/services/ai.js";
import { isAiConfigured } from "../src/config.js";
import { formatQuotaHelp } from "../src/services/gemini.js";

console.log("=== ИИ тексеру ===\n");

if (!isAiConfigured()) {
  console.log("ҚАТЕ: ИИ кілті жоқ.");
  console.log("→ Groq (ұсынылады): https://console.groq.com/keys → GROQ_API_KEY");
  console.log("→ .env: AI_PROVIDER=groq");
  process.exit(1);
}

const provider = getActiveProvider();
console.log("Провайдер:", provider);

const result = await checkAiConnection();

if (result.ok) {
  console.log("OK — ИИ жұмыс істейді:", result.model);
  process.exit(0);
}

if (result.reason === "invalid_key") {
  console.log("ҚАТЕ: Кілт жарамсыз.");
  process.exit(1);
}

if (result.reason === "quota") {
  console.log("ҚАТЕ: Лимит / квота:");
  if (result.error) console.log("→", formatQuotaHelp(result.error));
  if (provider === "gemini") {
    console.log("→ Groq қолданыңыз: console.groq.com/keys");
  }
  process.exit(1);
}

console.log("ҚАТЕ: ИИ қолжетімсіз.");
process.exit(1);

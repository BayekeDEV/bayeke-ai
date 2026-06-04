import { createApp } from "./src/app.js";
import { initDatabase, shutdownDatabase } from "./src/db/index.js";
import { PORT, isAiConfigured, isGroqConfigured } from "./src/config.js";
import { checkAiConnection, getActiveProvider } from "./src/services/ai.js";
import { formatQuotaHelp } from "./src/services/gemini.js";

const HOST = process.env.HOST || "0.0.0.0";

async function logAiStatus() {
  if (!isAiConfigured()) {
    console.warn("⚠ ИИ кілті жоқ — GROQ_API_KEY (console.groq.com) немесе GEMINI_API_KEY қойыңыз.");
    return;
  }

  const provider = getActiveProvider();
  console.log(`ИИ провайдер: ${provider}`);
  const result = await checkAiConnection();

  if (result.ok) {
    console.log(`✓ ИИ дайын (${provider}, модель: ${result.model})`);
    return;
  }

  if (result.reason === "invalid_key") {
    console.error(`✗ ${provider} кілті жарамсыз.`);
    if (provider === "groq") {
      console.error("  → https://console.groq.com/keys");
    } else {
      console.error("  → https://aistudio.google.com/apikey");
    }
    return;
  }

  if (result.reason === "quota") {
    console.error(`✗ ${provider} лимиті / квота:`);
    if (result.error) console.error(`  ${formatQuotaHelp(result.error)}`);
    if (provider === "gemini" && !isGroqConfigured()) {
      console.error("  → Шешім: console.groq.com/keys → GROQ_API_KEY + AI_PROVIDER=groq");
    }
    return;
  }

  console.warn("⚠ ИИ қазір қолжетімсіз.");
}

async function main() {
  await initDatabase();
  await logAiStatus();
  const app = createApp();
  const server = app.listen(PORT, HOST, () => {
    console.log(`Байеке ИИ бекенд: http://localhost:${PORT}`);
    console.log(`Фон: http://${HOST}:${PORT}`);
    console.log(`Фронтенд + API бір доменде (production)`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `\n✗ Порт ${PORT} бос емес — бекенд қазірдің өзінде іске қосылған.`
      );
      console.error(
        "  Қайта іске қосу керек болса, алдымен еski процесті тоқтатыңыз:"
      );
      console.error(
        `  Get-NetTCPConnection -LocalPort ${PORT} | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`
      );
      console.error("  Немесе браузерде http://localhost:3000 ашып тексеріңіз.\n");
      process.exit(1);
    }
    throw err;
  });

  const shutdown = async () => {
    server.close();
    await shutdownDatabase();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Сервер іске қосылмады:", err.message || err);
  if (err.message?.includes("auth") || err.message?.includes("Authentication")) {
    console.error("→ DATABASE_URL: username/password дұрыс па? Парольде @ # болsa URL encode");
  }
  if (err.message?.includes("SSL") || err.message?.includes("tls")) {
    console.error("→ MongoDB SSL қате: парольді encode etіңіз немесе Render-де MONGODB_USER + MONGODB_PASSWORD қолданыңыз");
  }
  process.exit(1);
});

import { createApp } from "./src/app.js";
import { initDatabase, shutdownDatabase } from "./src/db/index.js";
import { PORT } from "./src/config.js";

const HOST = process.env.HOST || "0.0.0.0";

async function main() {
  await initDatabase();
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
  process.exit(1);
});

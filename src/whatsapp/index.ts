import "dotenv/config";
import express from "express";
import { validateWhatsAppConfig, whatsappConfig } from "./config.js";
import { startWhatsAppBot } from "./bot.js";

const app = express();

try {
  validateWhatsAppConfig();
} catch (error) {
  console.error("Não foi possível validar a configuração do WhatsApp:", error);
  process.exit(1);
}

app.get("/health", (_request, response) => {
  response.json({ ok: true, service: "whatsapp-bot" });
});

app.listen(whatsappConfig.port, () => {
  console.log(`Health check do bot: http://localhost:${whatsappConfig.port}/health`);
});

void startWhatsAppBot().catch((error: unknown) => {
  console.error("Não foi possível iniciar o bot do WhatsApp:", error);
  process.exitCode = 1;
});

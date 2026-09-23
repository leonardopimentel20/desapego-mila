import makeWASocket, {
  Browsers,
  DisconnectReason,
  useMultiFileAuthState as loadMultiFileAuthState,
  type WASocket,
} from "@whiskeysockets/baileys";
import pino from "pino";
import qrcode from "qrcode-terminal";
import { Boom } from "@hapi/boom";
import { whatsappConfig } from "./config.js";
import { getAutomaticReply } from "./menu.js";

const logger = pino({ level: process.env.WHATSAPP_LOG_LEVEL || "info" });

let reconnecting = false;

function getDisconnectStatus(error: unknown) {
  return error instanceof Boom
    ? error.output.statusCode
    : (error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;
}

export async function startWhatsAppBot(): Promise<WASocket> {
  const { state, saveCreds } = await loadMultiFileAuthState(whatsappConfig.authFolder);
  const socket = makeWASocket({
    auth: state,
    browser: Browsers.ubuntu("Desapego da Mila"),
    logger,
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });

  socket.ev.on("creds.update", saveCreds);
  socket.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log("\nEscaneie este QR Code no WhatsApp:\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      reconnecting = false;
      console.log("WhatsApp conectado com sucesso.");
    }

    if (connection === "close") {
      const statusCode = getDisconnectStatus(lastDisconnect?.error);
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      console.error(`Conexão do WhatsApp encerrada. Código: ${statusCode ?? "desconhecido"}.`);

      if (!loggedOut && !reconnecting) {
        reconnecting = true;
        console.log("Tentando reconectar o WhatsApp...");
        setTimeout(() => {
          void startWhatsAppBot().catch((error: unknown) => {
            reconnecting = false;
            console.error("Falha ao reconectar o WhatsApp:", error);
          });
        }, 3000);
      } else if (loggedOut) {
        console.error("Sessão desconectada por logout. Remova a pasta de autenticação e escaneie um novo QR Code.");
      }
    }
  });

  socket.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const message of messages) {
      if (message.key.fromMe || !message.message || !message.key.remoteJid) continue;
      if (message.key.remoteJid.endsWith("@g.us") || message.key.remoteJid === "status@broadcast") continue;

      const text = message.message.conversation
        || message.message.extendedTextMessage?.text
        || message.message.imageMessage?.caption
        || message.message.videoMessage?.caption;

      if (!text?.trim()) continue;

      try {
        await socket.sendMessage(message.key.remoteJid, {
          text: getAutomaticReply(text, whatsappConfig.storeUrl),
        });
      } catch (error) {
        console.error("Não foi possível responder à mensagem do WhatsApp:", error);
      }
    }
  });

  return socket;
}

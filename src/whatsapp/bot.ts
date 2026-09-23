import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestWaWebVersion,
  useMultiFileAuthState as loadMultiFileAuthState,
  type WASocket,
} from "@whiskeysockets/baileys";
import pino from "pino";
import qrcode from "qrcode-terminal";
import { Boom } from "@hapi/boom";
import { whatsappConfig } from "./config.js";
import { getAutomaticReply, type ConversationState } from "./menu.js";

const logger = pino({ level: process.env.WHATSAPP_LOG_LEVEL || "info" });

let reconnecting = false;
let reconnectAttempts = 0;
const conversationStates = new Map<string, { state: ConversationState; expiresAt: number }>();
const conversationStateTtlMs = 30 * 60 * 1000;

function getDisconnectStatus(error: unknown) {
  return error instanceof Boom
    ? error.output.statusCode
    : (error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;
}

export async function startWhatsAppBot(): Promise<WASocket> {
  const { state, saveCreds } = await loadMultiFileAuthState(whatsappConfig.authFolder);
  const { version, isLatest } = await fetchLatestWaWebVersion({});

  console.log(
    `Versão do WhatsApp Web utilizada: ${version.join(".")}${isLatest ? "" : " (não marcada como mais recente)"}.`,
  );

  const socket = makeWASocket({
    auth: state,
    browser: Browsers.ubuntu("Desapego da Mila"),
    logger,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    version,
  });

  socket.ev.on("creds.update", saveCreds);
  socket.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log("\nEscaneie este QR Code no WhatsApp:\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      reconnecting = false;
      reconnectAttempts = 0;
      console.log("WhatsApp conectado com sucesso.");
    }

    if (connection === "close") {
      const statusCode = getDisconnectStatus(lastDisconnect?.error);
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      console.error(`Conexão do WhatsApp encerrada. Código: ${statusCode ?? "desconhecido"}.`);

      if (statusCode === 405) {
        console.error(
          "O WhatsApp rejeitou o handshake (405). Atualize o Baileys e tente novamente mais tarde.",
        );
      } else if (!loggedOut && !reconnecting && reconnectAttempts < 5) {
        reconnecting = true;
        reconnectAttempts += 1;
        console.log("Tentando reconectar o WhatsApp...");
        setTimeout(() => {
          void startWhatsAppBot().catch((error: unknown) => {
            reconnecting = false;
            console.error("Falha ao reconectar o WhatsApp:", error);
          });
        }, 3000);
      } else if (reconnectAttempts >= 5) {
        console.error("Reconexão interrompida após 5 tentativas. Reinicie o serviço após verificar a conexão.");
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
        const currentState = conversationStates.get(message.key.remoteJid);
        const state = currentState && currentState.expiresAt > Date.now()
          ? currentState.state
          : "menu";
        const reply = getAutomaticReply(text, whatsappConfig.storeUrl, state);

        conversationStates.set(message.key.remoteJid, {
          state: reply.nextState,
          expiresAt: Date.now() + conversationStateTtlMs,
        });

        await socket.sendMessage(message.key.remoteJid, {
          text: reply.text,
        });
      } catch (error) {
        console.error("Não foi possível responder à mensagem do WhatsApp:", error);
      }
    }
  });

  return socket;
}

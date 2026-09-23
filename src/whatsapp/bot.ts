import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestWaWebVersion,
  useMultiFileAuthState as loadMultiFileAuthState,
  type WASocket,
  type WAMessage,
} from "@whiskeysockets/baileys";
import pino from "pino";
import qrcode from "qrcode-terminal";
import QRCode from "qrcode";
import { Boom } from "@hapi/boom";
import mysql from "mysql2/promise";
import { rm } from "node:fs/promises";
import { whatsappConfig } from "./config.js";
import { getAutomaticReply, type ConversationState } from "./menu.js";

const logger = pino({ level: process.env.WHATSAPP_LOG_LEVEL || "info" });

let reconnecting = false;
let reconnectAttempts = 0;
let whatsappSocketActive = false;
let qrGeneration = 0;
type BotState = ConversationState | "delivery-choice" | "delivery-neighborhood" | "delivery-confirmation" | "payment" | "payment-proof";
const conversationStates = new Map<string, {
  state: BotState;
  expiresAt: number;
  reservationId?: string;
}>();
const conversationStateTtlMs = 30 * 60 * 1000;
const deliveryFee = 30;
let whatsappControlTimer: ReturnType<typeof setInterval> | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function unwrapMessageContent(message: WAMessage["message"]) {
  let content: Record<string, unknown> | undefined = isRecord(message)
    ? message
    : undefined;

  for (let depth = 0; content && depth < 3; depth += 1) {
    const wrapper = ["ephemeralMessage", "viewOnceMessage", "viewOnceMessageV2"]
      .map((key) => content?.[key])
      .find(isRecord);

    if (!wrapper) break;
    content = isRecord(wrapper.message) ? wrapper.message : undefined;
  }

  return content;
}

function getIncomingMessageText(message: WAMessage) {
  const content = unwrapMessageContent(message.message);
  if (!content) return undefined;

  const extendedText = isRecord(content.extendedTextMessage) ? content.extendedTextMessage : undefined;
  const image = isRecord(content.imageMessage) ? content.imageMessage : undefined;
  const video = isRecord(content.videoMessage) ? content.videoMessage : undefined;
  const document = isRecord(content.documentMessage) ? content.documentMessage : undefined;
  const text = [
    content.conversation,
    extendedText?.text,
    image?.caption,
    video?.caption,
    document?.caption,
  ].find((value): value is string => typeof value === "string" && value.trim().length > 0);

  if (text) return text;
  if (image || video || document) return "[comprovante enviado]";
  return undefined;
}

function getReservationId(text: string) {
  return /codigo\s+da\s+reserva\s*:\s*([0-9a-f-]{36})/i.exec(normalizeForBot(text))?.[1];
}

async function getWhatsAppControl() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não está configurada no serviço do WhatsApp.");
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [rows] = await connection.execute(
      "SELECT enabled, disconnect_requested FROM whatsapp_settings WHERE id = 1 LIMIT 1",
    );
    const [settings] = rows as Array<{ enabled: number; disconnect_requested: number }>;
    return settings || { enabled: 1, disconnect_requested: 0 };
  } finally {
    await connection.end();
  }
}

async function saveConnectedPhone(phone: string | null) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não está configurada no serviço do WhatsApp.");
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    await connection.execute(
      "UPDATE whatsapp_settings SET connected_phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
      [phone],
    );
  } finally {
    await connection.end();
  }
}

async function saveQrCode(qrCode: string | null) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não está configurada no serviço do WhatsApp.");
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    await connection.execute(
      "UPDATE whatsapp_settings SET qr_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
      [qrCode],
    );
  } finally {
    await connection.end();
  }
}

async function saveConnectionError(message: string | null) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não está configurada no serviço do WhatsApp.");
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    await connection.execute(
      "UPDATE whatsapp_settings SET connection_error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
      [message],
    );
  } finally {
    await connection.end();
  }
}

function getConnectedPhone(socket: WASocket) {
  const id = socket.user?.id;
  if (!id) return null;
  return id.split("@", 1)[0].split(":", 1)[0].replace(/\D/g, "") || null;
}

async function completeDisconnectRequest() {
  await rm(whatsappConfig.authFolder, { recursive: true, force: true });
  await saveConnectedPhone(null);
  await saveQrCode(null);
  await saveConnectionError(null);
}

function formatPhoneForLog(phone: string) {
  return phone.startsWith("55") ? `+${phone}` : `+55${phone}`;
}

async function updateReservationDelivery(
  reservationId: string,
  deliveryMethod: "pickup" | "motoboy",
  neighborhood: string | null,
  fee: number,
) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não está configurada no serviço do WhatsApp.");
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [reservationRows] = await connection.execute(
      "SELECT id, status FROM reservations WHERE id = ? LIMIT 1",
      [reservationId],
    );
    const reservation = (reservationRows as Array<{ id: string; status: string }>)[0];

    if (!reservation) {
      throw new Error(
        "Reserva não encontrada no banco conectado ao serviço do WhatsApp. Verifique se DATABASE_URL é a mesma do site.",
      );
    }

    if (reservation.status !== "PENDING") {
      throw new Error(`A reserva já foi finalizada e está com status ${reservation.status}.`);
    }

    const [result] = await connection.execute(
      `UPDATE reservations
       SET delivery_method = ?, delivery_neighborhood = ?, delivery_fee = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'PENDING'`,
      [deliveryMethod, neighborhood, fee, reservationId],
    );

    if (!("affectedRows" in result)) {
      throw new Error("O banco não retornou confirmação da atualização da reserva.");
    }

    const [updatedRows] = await connection.execute(
      `SELECT delivery_method, delivery_neighborhood, delivery_fee
       FROM reservations
       WHERE id = ? AND status = 'PENDING'
       LIMIT 1`,
      [reservationId],
    );
    const updatedReservation = (updatedRows as Array<{
      delivery_method: string | null;
      delivery_neighborhood: string | null;
      delivery_fee: string | number | null;
    }>)[0];

    if (
      !updatedReservation
      || updatedReservation.delivery_method !== deliveryMethod
      || updatedReservation.delivery_neighborhood !== neighborhood
      || Number(updatedReservation.delivery_fee || 0) !== fee
    ) {
      throw new Error("O banco não confirmou os dados de entrega da reserva.");
    }
  } finally {
    await connection.end();
  }
}

async function getReservationTotal(reservationId: string) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não está configurada no serviço do WhatsApp.");
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [rows] = await connection.execute(
      `SELECT COALESCE(SUM(p.price * ri.quantity), 0) AS subtotal,
              COALESCE(r.delivery_fee, 0) AS delivery_fee
       FROM reservations r
       INNER JOIN reservation_items ri ON ri.reservation_id = r.id
       INNER JOIN products p ON p.id = ri.product_id
       WHERE r.id = ? AND r.status = 'PENDING'
       GROUP BY r.id, r.delivery_fee`,
      [reservationId],
    );
    const [summary] = rows as Array<{ subtotal: string | number; delivery_fee: string | number }>;
    if (!summary) throw new Error("Reserva não encontrada ou já finalizada.");

    return Number(summary.subtotal) + Number(summary.delivery_fee);
  } finally {
    await connection.end();
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

async function getPaymentReply(reservationId: string) {
  const total = await getReservationTotal(reservationId);
  if (!whatsappConfig.pixKey) {
    return {
      text: `✅ Entrega registrada. O total da sua reserva é ${formatCurrency(total)}.\n\nA Mila enviará a chave Pix por aqui para você concluir o pagamento.`,
      total,
    };
  }

  return {
    text: [
      `✅ Entrega registrada. O total da sua reserva é ${formatCurrency(total)}.`,
      "",
      "Para pagar via Pix:",
      `• ${whatsappConfig.pixKeyType}: ${whatsappConfig.pixKey}`,
      `• Nome: ${whatsappConfig.pixName}`,
      whatsappConfig.pixCity ? `• Cidade: ${whatsappConfig.pixCity}` : "",
      `• Valor: ${formatCurrency(total)}`,
      "",
      "Depois de realizar o pagamento, responda *1* e envie o comprovante. Se ainda não for pagar, responda *2*.",
    ].filter(Boolean).join("\n"),
    total,
  };
}

function getDeliveryChoiceReply() {
  return [
    "Como você prefere receber sua reserva? 😊",
    "",
    "1️⃣ Retirar com a Mila",
    "2️⃣ Receber por motoboy",
    "",
    "Responda com 1 ou 2.",
  ].join("\n");
}

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
  whatsappSocketActive = true;

  if (whatsappControlTimer) clearInterval(whatsappControlTimer);
  whatsappControlTimer = setInterval(() => {
    void getWhatsAppControl().then(async (control) => {
      if (control.disconnect_requested) {
        if (!whatsappSocketActive) {
          await completeDisconnectRequest();
          return;
        }

        whatsappSocketActive = false;
        try {
          await socket.logout();
        } catch (error) {
          console.error("Não foi possível encerrar a sessão do WhatsApp normalmente:", error);
        } finally {
          await completeDisconnectRequest();
          reconnecting = false;
          reconnectAttempts = 0;
          console.log("Sessão do WhatsApp removida. Reative o atendimento para gerar um novo QR Code.");
        }
        return;
      }
      if (control.enabled && !whatsappSocketActive && !reconnecting) {
        reconnecting = true;
        console.log("Atendimento reativado. Iniciando uma nova sessão do WhatsApp...");
        setTimeout(() => {
          void startWhatsAppBot().catch((error: unknown) => {
            reconnecting = false;
            console.error("Falha ao reativar o WhatsApp:", error);
          });
        }, 3000);
      }
    }).catch((error: unknown) => {
      console.error("Não foi possível consultar o controle do WhatsApp:", error);
    });
  }, 5000);

  socket.ev.on("creds.update", saveCreds);
  socket.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      const currentQrGeneration = ++qrGeneration;
      await saveConnectionError(null);
      console.log("\nEscaneie este QR Code no WhatsApp:\n");
      qrcode.generate(qr, { small: true });
      void QRCode.toDataURL(qr, { width: 320, margin: 2 })
        .then((qrImage) => currentQrGeneration === qrGeneration ? saveQrCode(qrImage) : undefined)
        .catch((error: unknown) => console.error("Não foi possível preparar o QR Code para o painel:", error));
    }

    if (connection === "open") {
      reconnecting = false;
      reconnectAttempts = 0;
      const connectedPhone = getConnectedPhone(socket);
      await saveConnectedPhone(connectedPhone);
      await saveQrCode(null);
      await saveConnectionError(null);
      console.log(`WhatsApp conectado com sucesso: ${connectedPhone ? formatPhoneForLog(connectedPhone) : "número não identificado"}.`);
      if (whatsappConfig.expectedPhone && connectedPhone !== whatsappConfig.expectedPhone) {
        console.error(
          `Número inesperado conectado. Esperado: ${formatPhoneForLog(whatsappConfig.expectedPhone)}; conectado: ${connectedPhone ? formatPhoneForLog(connectedPhone) : "não identificado"}.`,
        );
      }
    }

    if (connection === "close") {
      whatsappSocketActive = false;
      qrGeneration += 1;
      await saveQrCode(null);
      const statusCode = getDisconnectStatus(lastDisconnect?.error);
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      console.error(`Conexão do WhatsApp encerrada. Código: ${statusCode ?? "desconhecido"}.`);
      if (!loggedOut) {
        await saveConnectionError(
          statusCode === 408
            ? "O QR Code expirou. Aguarde a geração de um novo código."
            : `A conexão foi recusada pelo WhatsApp (código ${statusCode ?? "desconhecido"}). Gere um novo QR Code.`,
        );
      }

      if (statusCode === 405) {
        console.error(
          "O WhatsApp rejeitou o handshake (405). Atualize o Baileys e tente novamente mais tarde.",
        );
      } else if (!loggedOut && !reconnecting && reconnectAttempts < 5) {
        void getWhatsAppControl().then((control) => {
          if (!control.enabled || control.disconnect_requested) return;
          reconnecting = true;
          reconnectAttempts += 1;
          console.log("Tentando reconectar o WhatsApp...");
          setTimeout(() => {
            void startWhatsAppBot().catch((error: unknown) => {
              reconnecting = false;
              console.error("Falha ao reconectar o WhatsApp:", error);
            });
          }, 3000);
        }).catch((error: unknown) => {
          console.error("Não foi possível verificar se a reconexão está habilitada:", error);
        });
      } else if (reconnectAttempts >= 5) {
        console.error("Reconexão interrompida após 5 tentativas. Reinicie o serviço após verificar a conexão.");
      } else if (loggedOut) {
        console.error("Sessão desconectada por logout. Reative o atendimento para gerar um novo QR Code.");
      }
    }
  });

  socket.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const message of messages) {
      if (message.key.fromMe || !message.message || !message.key.remoteJid) continue;
      if (message.key.remoteJid.endsWith("@g.us") || message.key.remoteJid === "status@broadcast") continue;
      const control = await getWhatsAppControl();
      if (!control.enabled) continue;

      const text = getIncomingMessageText(message);

      if (!text?.trim()) continue;

      try {
        const currentState = conversationStates.get(message.key.remoteJid);
        const state = currentState && currentState.expiresAt > Date.now()
          ? currentState.state
          : "menu";
        const reservationId = getReservationId(text);

        if (reservationId) {
          conversationStates.set(message.key.remoteJid, {
            state: "delivery-choice",
            reservationId,
            expiresAt: Date.now() + conversationStateTtlMs,
          });
          await socket.sendMessage(message.key.remoteJid, {
            text: `✅ Recebi sua reserva (${reservationId.slice(0, 8)}...).\n\n${getDeliveryChoiceReply()}`,
          });
          continue;
        }

        if (state === "delivery-choice" && currentState?.reservationId) {
          if (/^(1|retirada|retirar|buscar|vou buscar)$/.test(normalizeForBot(text))) {
            await updateReservationDelivery(currentState.reservationId, "pickup", null, 0);
            const paymentReply = await getPaymentReply(currentState.reservationId);
            conversationStates.set(message.key.remoteJid, {
              ...currentState,
              state: "payment",
              expiresAt: Date.now() + conversationStateTtlMs,
            });
            await socket.sendMessage(message.key.remoteJid, {
              text: `Perfeito 😊 Registrei a retirada com a Mila.\n\n${paymentReply.text}`,
            });
            continue;
          }

          if (/^(2|motoboy|entrega|entregar|delivery)$/.test(normalizeForBot(text))) {
            conversationStates.set(message.key.remoteJid, {
              ...currentState,
              state: "delivery-neighborhood",
              expiresAt: Date.now() + conversationStateTtlMs,
            });
            await socket.sendMessage(message.key.remoteJid, {
              text: "Combinado! A entrega por motoboy tem taxa fixa de R$ 30,00 para a cidade inteira. Qual é o seu bairro e cidade?",
            });
            continue;
          }

          await socket.sendMessage(message.key.remoteJid, { text: getDeliveryChoiceReply() });
          continue;
        }

        if (state === "delivery-neighborhood" && currentState?.reservationId) {
          const neighborhood = text.trim();
          await updateReservationDelivery(currentState.reservationId, "motoboy", neighborhood, deliveryFee);
          conversationStates.set(message.key.remoteJid, {
            ...currentState,
            state: "delivery-confirmation",
            expiresAt: Date.now() + conversationStateTtlMs,
          });
          await socket.sendMessage(message.key.remoteJid, {
            text: `📍 Anotei: ${neighborhood}\n🚴 Taxa fixa de entrega: R$ 30,00\n\nEstá correto?\n1️⃣ Sim\n2️⃣ Corrigir bairro`,
          });
          continue;
        }

        if (state === "delivery-confirmation" && currentState?.reservationId) {
          if (/^(1|sim|correto|confirmo)$/.test(normalizeForBot(text))) {
            const paymentReply = await getPaymentReply(currentState.reservationId);
            conversationStates.set(message.key.remoteJid, {
              ...currentState,
              state: "payment",
              expiresAt: Date.now() + conversationStateTtlMs,
            });
            await socket.sendMessage(message.key.remoteJid, {
              text: `Perfeito 😊 Dados de entrega registrados.\n\n${paymentReply.text}`,
            });
            continue;
          }
          if (/^(2|corrigir|trocar)$/.test(normalizeForBot(text))) {
            conversationStates.set(message.key.remoteJid, {
              ...currentState,
              state: "delivery-neighborhood",
              expiresAt: Date.now() + conversationStateTtlMs,
            });
            await socket.sendMessage(message.key.remoteJid, { text: "Claro! Envie novamente seu bairro e cidade." });
            continue;
          }
        }

        if (state === "payment" && currentState?.reservationId) {
          if (/^(1|sim|paguei|pago|realizei)$/.test(normalizeForBot(text))) {
            conversationStates.set(message.key.remoteJid, {
              ...currentState,
              state: "payment-proof",
              expiresAt: Date.now() + conversationStateTtlMs,
            });
            await socket.sendMessage(message.key.remoteJid, {
              text: "Perfeito 😊 Agora envie o comprovante do Pix nesta conversa. A Mila vai conferir o pagamento antes de finalizar a venda.",
            });
            continue;
          }

          if (/^(2|ainda nao|nao|não)$/.test(normalizeForBot(text))) {
            await socket.sendMessage(message.key.remoteJid, {
              text: "Sem problema 😊 Quando fizer o Pix, responda *1* e envie o comprovante. A reserva continua aguardando confirmação da Mila.",
            });
            continue;
          }

          await socket.sendMessage(message.key.remoteJid, {
            text: "Para continuar, responda *1* depois de pagar via Pix ou *2* se ainda não realizou o pagamento.",
          });
          continue;
        }

        if (state === "payment-proof" && currentState?.reservationId) {
          conversationStates.delete(message.key.remoteJid);
          await socket.sendMessage(message.key.remoteJid, {
            text: "Comprovante recebido 😊 A Mila vai conferir o Pix e confirmar sua reserva. Assim que validar, ela continuará com você até finalizar a entrega ou retirada.",
          });
          continue;
        }

        const reply = getAutomaticReply(text, whatsappConfig.storeUrl, state === "menu" || state === "reservation" || state === "selling" ? state : "menu");

        conversationStates.set(message.key.remoteJid, {
          state: reply.nextState,
          expiresAt: Date.now() + conversationStateTtlMs,
        });

        await socket.sendMessage(message.key.remoteJid, {
          text: reply.text,
        });
      } catch (error) {
        console.error("Não foi possível responder à mensagem do WhatsApp:", error);
        const errorCode = (error as { code?: string } | null)?.code;
        const errorMessage = error instanceof Error ? error.message : "";
        const responseText = errorCode === "ER_BAD_FIELD_ERROR"
          ? "Não consegui atualizar os dados de entrega porque o banco ainda está sendo atualizado. Reinicie o serviço do WhatsApp e tente novamente em alguns instantes."
          : errorMessage.includes("DATABASE_URL")
            ? "Não encontrei essa reserva no banco do WhatsApp. O serviço precisa usar a mesma DATABASE_URL do site. A Mila já poderá continuar o atendimento manualmente."
            : errorMessage.includes("já foi finalizada")
              ? "Essa reserva já foi finalizada no painel. A Mila continuará o atendimento manualmente por aqui."
          : "Tive um problema ao atualizar sua reserva. A Mila já poderá continuar o atendimento manualmente por aqui.";

        try {
          await socket.sendMessage(message.key.remoteJid, { text: responseText });
        } catch (responseError) {
          console.error("Não foi possível enviar o aviso de falha ao WhatsApp:", responseError);
        }
      }
    }
  });

  return socket;
}

function normalizeForBot(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

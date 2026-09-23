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
import { randomUUID } from "node:crypto";
import { whatsappConfig } from "./config.js";
import { getAutomaticReply, type ConversationState } from "./menu.js";
import { deliveryFields, deliveryPrompts, deliverySummary, isCompleteDelivery, validateDeliveryField, type DeliveryDraft, type DeliveryDetails, type DeliveryField } from "./delivery.js";
import { quoteShipping } from "../shipping/geoapify.js";
import { FIXED_DELIVERY_FEE, ShippingError, type ShippingQuote, type ShippingSettings } from "../shipping/pricing.js";
import { getShippingSettings, reserveGeoapifyCredits } from "../shipping/store.js";

const logger = pino({ level: process.env.WHATSAPP_LOG_LEVEL || "info" });

let reconnecting = false;
let reconnectAttempts = 0;
let whatsappSocketActive = false;
let qrGeneration = 0;
type BotState = ConversationState | "delivery-choice" | "delivery-neighborhood" | "delivery-details" | "delivery-quote" | "delivery-confirmation" | "payment" | "payment-proof";
type BotSession = {
  state: BotState;
  expiresAt: number;
  reservationId?: string;
  deliveryDraft?: DeliveryDraft;
  deliveryField?: DeliveryField;
  shippingSettings?: ShippingSettings;
  shippingQuote?: ShippingQuote;
  lastQuoteAttemptAt?: number;
};
const conversationStates = new Map<string, BotSession>();
const conversationStateTtlMs = 30 * 60 * 1000;
let whatsappControlTimer: ReturnType<typeof setInterval> | undefined;

const shippingRetryReply = "Responda *1* para tentar calcular novamente, *2* para corrigir o endereço, *3* para voltar à escolha de retirada ou *4* para falar com a Mila.";

async function prepareShippingQuote(socket: WASocket, customerJid: string, session: BotSession) {
  const details = session.deliveryDraft;
  if (!isCompleteDelivery(details)) throw new Error("Dados de entrega incompletos.");
  if (session.shippingSettings?.enabled && session.lastQuoteAttemptAt && Date.now() - session.lastQuoteAttemptAt < 20000) {
    await socket.sendMessage(customerJid, { text: `Aguarde alguns segundos antes de tentar novamente.\n\n${shippingRetryReply}` });
    return;
  }
  const pending: BotSession = { ...session, state: "delivery-quote", shippingQuote: undefined, lastQuoteAttemptAt: Date.now(), expiresAt: Date.now() + conversationStateTtlMs };
  conversationStates.set(customerJid, pending);
  let quote: ShippingQuote;
  try {
    const settings = session.shippingSettings || await getShippingSettings();
    pending.shippingSettings = settings;
    quote = await quoteShipping(settings, details, { apiKey: process.env.GEOAPIFY_API_KEY || "", reserveCredits: reserveGeoapifyCredits });
  } catch (error) {
    if (conversationStates.get(customerJid) !== pending) return;
    const reason = error instanceof ShippingError && (error.code === "address" || error.code === "quota" || error.code === "route")
      ? error.message : "Não consegui consultar o frete agora. Nenhum valor foi confirmado.";
    await socket.sendMessage(customerJid, { text: `${reason}\n\n${shippingRetryReply}` });
    return;
  }
  if (conversationStates.get(customerJid) !== pending) return;
  conversationStates.set(customerJid, { ...pending, state: "delivery-confirmation", shippingQuote: quote, expiresAt: Date.now() + conversationStateTtlMs });
  await socket.sendMessage(customerJid, { text: deliverySummary(details, quote) });
}

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

function getCustomerPhone(jid: string) {
  return jid.split("@", 1)[0].split(":", 1)[0].replace(/\D/g, "");
}

function getOwnerJid() {
  if (!/^\d{8,15}$/.test(whatsappConfig.ownerPhone)) return null;
  return `${whatsappConfig.ownerPhone}@s.whatsapp.net`;
}

async function hasPendingHandoff(customerJid: string) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não está configurada no serviço do WhatsApp.");
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [rows] = await connection.execute(
      "SELECT id FROM whatsapp_handoffs WHERE customer_jid = ? AND status = 'PENDING' LIMIT 1",
      [customerJid],
    );
    return (rows as Array<{ id: string }>).length > 0;
  } finally {
    await connection.end();
  }
}

async function createHandoff(customerJid: string, message: string) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não está configurada no serviço do WhatsApp.");
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    await connection.execute(
      `INSERT INTO whatsapp_handoffs
       (id, customer_jid, customer_phone, last_message, status)
       VALUES (?, ?, ?, ?, 'PENDING')
       ON DUPLICATE KEY UPDATE last_message = VALUES(last_message), status = 'PENDING', updated_at = CURRENT_TIMESTAMP`,
      [randomUUID(), customerJid, getCustomerPhone(customerJid), message.slice(0, 4000)],
    );
  } finally {
    await connection.end();
  }
}

async function resumeHandoff(customerJid: string) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não está configurada no serviço do WhatsApp.");
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    await connection.execute(
      "UPDATE whatsapp_handoffs SET status = 'RESUMED', updated_at = CURRENT_TIMESTAMP WHERE customer_jid = ? AND status = 'PENDING'",
      [customerJid],
    );
  } finally {
    await connection.end();
  }
}

async function notifyOwner(socket: WASocket, customerJid: string, message: string) {
  const ownerJid = getOwnerJid();
  if (!ownerJid) {
    console.error("WHATSAPP_OWNER_PHONE não configurado ou inválido; o pedido humano foi registrado, mas não foi enviado alerta.");
    return false;
  }
  await socket.sendMessage(ownerJid, {
    text: [
      "🔔 Novo atendimento solicitado",
      "",
      `Cliente: ${getCustomerPhone(customerJid) || "número não identificado"}`,
      `Mensagem: ${message.slice(0, 500)}`,
      "",
      "Responda diretamente ao cliente no WhatsApp. O robô ficará em silêncio nesta conversa até o cliente enviar *menu*.",
    ].join("\n"),
  });
  return true;
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
  details?: DeliveryDetails,
) {
  if (deliveryMethod === "motoboy" && !isCompleteDelivery(details)) {
    throw new Error("Dados de entrega incompletos.");
  }
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
       SET delivery_method = ?, delivery_neighborhood = ?, delivery_fee = ?,
           delivery_recipient = ?, delivery_phone = ?, delivery_street = ?, delivery_number = ?,
           delivery_complement = ?, delivery_reference = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'PENDING'`,
      [deliveryMethod, neighborhood, fee, details?.recipient ?? null, details?.phone ?? null,
        details?.street ?? null, details?.number ?? null, details?.complement || null, details?.reference || null, reservationId],
    );

    if (!("affectedRows" in result)) {
      throw new Error("O banco não retornou confirmação da atualização da reserva.");
    }

    const [updatedRows] = await connection.execute(
      `SELECT delivery_method, delivery_neighborhood, delivery_fee,
              delivery_recipient, delivery_phone, delivery_street, delivery_number,
              delivery_complement, delivery_reference
       FROM reservations
       WHERE id = ? AND status = 'PENDING'
       LIMIT 1`,
      [reservationId],
    );
    const updatedReservation = (updatedRows as Array<{
      delivery_method: string | null;
      delivery_neighborhood: string | null;
      delivery_fee: string | number | null;
      delivery_recipient: string | null;
      delivery_phone: string | null;
      delivery_street: string | null;
      delivery_number: string | null;
      delivery_complement: string | null;
      delivery_reference: string | null;
    }>)[0];

    if (
      !updatedReservation
      || updatedReservation.delivery_method !== deliveryMethod
      || updatedReservation.delivery_neighborhood !== neighborhood
      || Number(updatedReservation.delivery_fee || 0) !== fee
      || updatedReservation.delivery_recipient !== (details?.recipient ?? null)
      || updatedReservation.delivery_phone !== (details?.phone ?? null)
      || updatedReservation.delivery_street !== (details?.street ?? null)
      || updatedReservation.delivery_number !== (details?.number ?? null)
      || updatedReservation.delivery_complement !== (details?.complement || null)
      || updatedReservation.delivery_reference !== (details?.reference || null)
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
      reconnecting = false;
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
      } else if (!loggedOut && reconnectAttempts < 5) {
        void getWhatsAppControl().then((control) => {
          if (!control.enabled || control.disconnect_requested) return;
          reconnecting = true;
          reconnectAttempts += 1;
          console.log(
            statusCode === 515
              ? "O WhatsApp solicitou reinício da sessão. Gerando um novo QR Code..."
              : "Tentando reconectar o WhatsApp...",
          );
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

        if (/^menu$|^inicio$/.test(normalizeForBot(text))) {
          await resumeHandoff(message.key.remoteJid);
        } else if (await hasPendingHandoff(message.key.remoteJid)) {
          continue;
        }

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
            const shippingSettings = await getShippingSettings();
            conversationStates.set(message.key.remoteJid, {
              ...currentState,
              state: "delivery-neighborhood",
              shippingSettings,
              shippingQuote: undefined,
              expiresAt: Date.now() + conversationStateTtlMs,
            });
            await socket.sendMessage(message.key.remoteJid, {
              text: shippingSettings.enabled
                ? "Combinado! O frete em Joinville será calculado pela distância após você informar o endereço completo. Você verá o valor antes de confirmar. Qual é o seu bairro e cidade?"
                : `Combinado! A entrega por motoboy tem taxa fixa de ${formatCurrency(FIXED_DELIVERY_FEE)} para a cidade inteira. Qual é o seu bairro e cidade?`,
            });
            continue;
          }

          await socket.sendMessage(message.key.remoteJid, { text: getDeliveryChoiceReply() });
          continue;
        }

        if ((state === "delivery-neighborhood" || state === "delivery-details") && currentState?.reservationId) {
          const field = state === "delivery-neighborhood" ? "neighborhood" : currentState.deliveryField;
          if (!field) throw new Error("Etapa de entrega inválida.");
          const result = validateDeliveryField(field, text);
          if (result.error) {
            await socket.sendMessage(message.key.remoteJid, { text: result.error });
            continue;
          }
          const deliveryDraft = { ...currentState.deliveryDraft, [field]: result.value };
          const nextField = deliveryFields[deliveryFields.indexOf(field) + 1];
          const nextSession: BotSession = {
            ...currentState,
            deliveryDraft,
            deliveryField: nextField,
            state: nextField ? "delivery-details" : "delivery-quote",
            expiresAt: Date.now() + conversationStateTtlMs,
          };
          conversationStates.set(message.key.remoteJid, nextSession);
          if (nextField) await socket.sendMessage(message.key.remoteJid, { text: deliveryPrompts[nextField] });
          else await prepareShippingQuote(socket, message.key.remoteJid, nextSession);
          continue;
        }

        if (state === "delivery-quote" && currentState?.reservationId) {
          const option = normalizeForBot(text);
          if (option === "1") {
            await prepareShippingQuote(socket, message.key.remoteJid, currentState);
            continue;
          }
          if (option === "2" || option === "3") {
            conversationStates.set(message.key.remoteJid, {
              ...currentState, state: option === "2" ? "delivery-neighborhood" : "delivery-choice",
              deliveryDraft: undefined, deliveryField: undefined, shippingQuote: undefined,
              expiresAt: Date.now() + conversationStateTtlMs,
            });
            await socket.sendMessage(message.key.remoteJid, { text: option === "2" ? "Vamos corrigir os dados. Qual é o bairro e a cidade?" : getDeliveryChoiceReply() });
            continue;
          }
          if (option !== "4") {
            await socket.sendMessage(message.key.remoteJid, { text: shippingRetryReply });
            continue;
          }
          // Cancela uma consulta ainda em andamento antes de solicitar atendimento.
          conversationStates.set(message.key.remoteJid, { state: "menu", expiresAt: Date.now() + conversationStateTtlMs });
        }

        if (state === "delivery-confirmation" && currentState?.reservationId) {
          if (/^(1|sim|correto|confirmo)$/.test(normalizeForBot(text))) {
            const details = currentState.deliveryDraft;
            if (!isCompleteDelivery(details)) throw new Error("Dados de entrega incompletos.");
            const quote = currentState.shippingQuote;
            if (!quote) throw new Error("Cotação de entrega ausente.");
            await updateReservationDelivery(currentState.reservationId, "motoboy", details.neighborhood, quote.fee, details);
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
              deliveryDraft: undefined,
              deliveryField: undefined,
              shippingQuote: undefined,
              expiresAt: Date.now() + conversationStateTtlMs,
            });
            await socket.sendMessage(message.key.remoteJid, { text: "Claro! Envie novamente seu bairro e cidade." });
            continue;
          }
          await socket.sendMessage(message.key.remoteJid, { text: "Responda *1* para confirmar os dados de entrega ou *2* para corrigir." });
          continue;
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

        if (normalizeForBot(text) === "4") {
          const handoffMessage = state === "delivery-quote" && currentState?.reservationId
            ? `Conferir frete da reserva ${currentState.reservationId}. Endereço informado: ${currentState.deliveryDraft?.street || ""}, ${currentState.deliveryDraft?.number || ""}, ${currentState.deliveryDraft?.neighborhood || ""}.`
            : text;
          await createHandoff(message.key.remoteJid, handoffMessage);
          const notified = await notifyOwner(socket, message.key.remoteJid, handoffMessage);
          conversationStates.set(message.key.remoteJid, {
            state: "menu",
            expiresAt: Date.now() + conversationStateTtlMs,
          });
          await socket.sendMessage(message.key.remoteJid, {
            text: notified
              ? "💬 Avisei a Mila agora. Ela recebeu seu pedido e falará com você assim que estiver disponível."
              : "💬 Registrei seu pedido de atendimento. A Mila será avisada assim que o número administrativo estiver configurado.",
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

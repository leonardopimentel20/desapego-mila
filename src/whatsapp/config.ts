import path from "node:path";

function getPublicStoreUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL || "https://desapego-mila-production.up.railway.app";

  try {
    const url = new URL(configuredUrl);
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/+$/, "");
  } catch {
    throw new Error("NEXT_PUBLIC_APP_URL inválida. Informe a URL pública completa, sem o caminho /admin.");
  }
}

export const whatsappConfig = {
  authFolder: path.resolve(process.env.WHATSAPP_AUTH_FOLDER || "./auth_info_baileys"),
  port: Number(process.env.WHATSAPP_BOT_PORT || 3001),
  storeUrl: getPublicStoreUrl(),
  pixKey: process.env.PIX_KEY || "",
  pixKeyType: process.env.PIX_KEY_TYPE || "chave Pix",
  pixName: process.env.PIX_NAME || "Desapego da Mila",
  pixCity: process.env.PIX_CITY || "",
  expectedPhone: (process.env.WHATSAPP_EXPECTED_NUMBER || "").replace(/\D/g, ""),
  ownerPhone: (process.env.WHATSAPP_OWNER_PHONE || "").replace(/\D/g, ""),
};

export function validateWhatsAppConfig() {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.DATABASE_URL) {
    errors.push("DATABASE_URL não está configurada.");
  }

  if (!whatsappConfig.ownerPhone) {
    warnings.push("WHATSAPP_OWNER_PHONE não configurada; alertas de atendimento humano ficarão apenas registrados no banco.");
  } else if (!/^\d{8,15}$/.test(whatsappConfig.ownerPhone)) {
    errors.push("WHATSAPP_OWNER_PHONE deve conter de 8 a 15 dígitos, incluindo o código do país.");
  }

  if (!whatsappConfig.pixKey) {
    warnings.push("PIX_KEY não configurada; o bot não enviará uma chave Pix automaticamente.");
  }

  if (errors.length > 0) {
    throw new Error(`Configuração inválida do WhatsApp: ${errors.join(" ")}`);
  }

  for (const warning of warnings) {
    console.warn(`[WhatsApp] ${warning}`);
  }
}

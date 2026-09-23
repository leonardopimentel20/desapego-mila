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

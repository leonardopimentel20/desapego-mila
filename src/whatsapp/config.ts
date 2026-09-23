import path from "node:path";

export const whatsappConfig = {
  authFolder: path.resolve(process.env.WHATSAPP_AUTH_FOLDER || "./auth_info_baileys"),
  port: Number(process.env.WHATSAPP_BOT_PORT || 3001),
  storeUrl: (process.env.NEXT_PUBLIC_APP_URL || "https://desapego-mila-production.up.railway.app").replace(/\/+$/, ""),
  pixKey: process.env.PIX_KEY || "",
  pixKeyType: process.env.PIX_KEY_TYPE || "chave Pix",
  pixName: process.env.PIX_NAME || "Desapego da Mila",
  pixCity: process.env.PIX_CITY || "",
  expectedPhone: (process.env.WHATSAPP_EXPECTED_NUMBER || "").replace(/\D/g, ""),
};

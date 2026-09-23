import path from "node:path";

export const whatsappConfig = {
  authFolder: path.resolve(process.env.WHATSAPP_AUTH_FOLDER || "./auth_info_baileys"),
  port: Number(process.env.WHATSAPP_BOT_PORT || 3001),
  storeUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
};

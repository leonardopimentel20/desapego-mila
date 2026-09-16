import "server-only";

import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "admin_session";

function requireAdminCredentials() {
  const password = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;

  if (!password || !sessionSecret) {
    throw new Error("Configuração de autenticação administrativa ausente.");
  }

  return { password, sessionSecret };
}

export function createAdminSessionToken() {
  const { password, sessionSecret } = requireAdminCredentials();

  return createHash("sha256")
    .update(`${password}:${sessionSecret}`)
    .digest("hex");
}

export function isValidAdminPassword(candidate: string) {
  const { password } = requireAdminCredentials();
  const candidateBuffer = Buffer.from(candidate);
  const passwordBuffer = Buffer.from(password);

  return (
    candidateBuffer.length === passwordBuffer.length &&
    timingSafeEqual(candidateBuffer, passwordBuffer)
  );
}

export async function requireAdminSession() {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  const expectedToken = createAdminSessionToken();

  if (!token) {
    throw new Error("Não autorizado.");
  }

  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expectedToken);

  if (
    tokenBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(tokenBuffer, expectedBuffer)
  ) {
    throw new Error("Não autorizado.");
  }
}

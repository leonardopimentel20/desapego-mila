import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

async function createExpectedToken() {
  const password = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;

  if (!password || !sessionSecret) return null;

  const data = new TextEncoder().encode(`${password}:${sessionSecret}`);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Protege qualquer rota que comece com /admin (exceto a própria página de login)
  if (path.startsWith("/admin") && path !== "/admin/login") {
    const sessionCookie = request.cookies.get("admin_session")?.value;
    const expectedToken = await createExpectedToken();

    if (!sessionCookie || !expectedToken || !constantTimeEqual(sessionCookie, expectedToken)) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

'use server';

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  isValidAdminPassword,
} from "../../../lib/admin-auth";

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") || "");

  if (!isValidAdminPassword(password)) {
    redirect("/admin/login?error=senha_incorreta");
  }

  const token = createAdminSessionToken();

  // Salva o cookie de sessão por 30 dias
  const cookieStore = await cookies();
  cookieStore.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 10,// 10 horas
    path: "/",
  });

  redirect("/admin");
}

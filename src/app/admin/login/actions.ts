'use server';

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") || "");
  const adminPassword = process.env.ADMIN_PASSWORD || "123456"; // Senha padrão caso não esteja no .env

  if (password !== adminPassword) {
    redirect("/admin/login?error=senha_incorreta");
  }

  // Gera o token de sessão usando o segredo do ambiente
  const sessionSecret = process.env.ADMIN_SESSION_SECRET || "secret_key";
  const token = crypto
    .createHash("sha256")
    .update(`${adminPassword}:${sessionSecret}`)
    .digest("hex");

  // Salva o cookie de sessão por 30 dias
  const cookieStore = await cookies();
  cookieStore.set({
    name: "admin_session",
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 10,// 10 horas
    path: "/",
  });

  redirect("/admin");
}
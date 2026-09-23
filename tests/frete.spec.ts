import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";

test("configurações de frete exigem login administrativo", async ({ page }) => {
  await page.goto("/admin/frete");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("painel de frete exibe configurações sem expor a chave ou alterar valores", async ({ context, page }, testInfo) => {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  test.skip(!password || !secret, "Credenciais administrativas ausentes no ambiente de teste.");
  const token = createHash("sha256").update(`${password}:${secret}`).digest("hex");
  await context.addCookies([{ name: "admin_session", value: token, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
  await page.goto("/admin/frete");
  await expect(page.getByRole("heading", { name: "Frete por distância" })).toBeVisible();
  await expect(page.getByLabel("Rua ou avenida")).toBeVisible();
  await expect(page.getByLabel("Valor mínimo (R$)")).toBeVisible();
  await expect(page.getByLabel("Preço por km (R$)")).toBeVisible();
  await expect(page.getByRole("button", { name: "Salvar configurações" })).toBeVisible();
  const key = process.env.GEOAPIFY_API_KEY;
  if (key) expect((await page.content()).includes(key)).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("frete.png"), fullPage: true });
});

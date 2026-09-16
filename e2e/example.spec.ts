import { test, expect } from '@playwright/test';

test.describe('Testes E2E - Desapego da Mila', () => {

  test('Cliente navegando na vitrine pública e aplicando filtros', async ({ page }) => {
    // Acessa a home pública
    await page.goto('/');

    // Verifica se o título da lojinha apareceu na tela
    await expect(page.locator('h1', { hasText: 'Desapego da Mila' })).toBeVisible();

    // Clica no filtro de categoria "Roupas"
    await page.click('a[href="/?category=roupas"]');

    // Valida se a URL mudou corretamente para o filtro de roupas
    await expect(page).toHaveURL(/\/\?category=roupas/);
  });

  test('Tentativa de acesso ao Admin deve redirecionar para o Login', async ({ page }) => {
    // Tenta entrar direto na rota protegida
    await page.goto('/admin');

    // Deve ser barrado pelo middleware e cair na tela de login
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.locator('h1', { hasText: 'Desapego da Mila' })).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

});
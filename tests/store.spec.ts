import { test, expect } from '@playwright/test';

test.describe('Fluxo do Usuário Final - Desapego da Mila', () => {

  test('Deve navegar pela vitrine, filtrar por categoria e abrir detalhes da peça', async ({ page }) => {
    // 1. Acessa a vitrine pública
    await page.goto('http://localhost:3000/');

    // 2. Verifica se o título principal carregou
    await expect(page.locator('h1', { hasText: 'Desapego da Mila' })).toBeVisible();

    // 3. Clica no filtro de categoria "Roupas" na navegação secundária
    await page.click('a[href="/?category=roupas"]');

    // 4. Confirma que a URL atualizou com o filtro
    await expect(page).toHaveURL(/\/\?category=roupas/);

    // 5. Clica no primeiro produto do grid para ver os detalhes
    const firstProduct = page.locator('a[href*="/produtos/"]').first();
    if (await firstProduct.count() > 0) {
      await firstProduct.click();
      
      // 6. Confirma que o botão de WhatsApp está presente na página do produto
      const whatsappButton = page.locator('a[href*="wa.me"]');
      await expect(whatsappButton).toBeVisible();
    }
  });

  test('Deve proteger a rota /admin e permitir login com senha', async ({ page }) => {
    // 1. Tenta acessar o painel administrativo sem estar logado
    await page.goto('http://localhost:3000/admin');

    // 2. Deve ser redirecionado para a tela de login
    await expect(page).toHaveURL(/\/admin\/login/);

    // 3. Preenche a senha da administração
    await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD || '123456');

    // 4. Clica no botão de entrar
    await page.click('button[type="submit"]');

    // 5. Confirma que entrou com sucesso no painel administrativo
    await expect(page).toHaveURL('http://localhost:3000/admin');
    await expect(page.locator('h1', { hasText: 'Painel Administrativo' })).toBeVisible();
  });

});
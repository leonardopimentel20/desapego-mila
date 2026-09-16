import { test, expect } from '@playwright/test';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  throw new Error('ADMIN_PASSWORD precisa estar configurada para executar os testes.');
}

test.describe('Fluxo do Usuário Final - Desapego da Mila', () => {

  test('Deve navegar pela vitrine, filtrar por categoria e abrir detalhes da peça', async ({ page }) => {
    // 1. Acessa a vitrine pública
    await page.goto('/');

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
    await page.goto('/admin');

    // 2. Deve ser redirecionado para a tela de login
    await expect(page).toHaveURL(/\/admin\/login/);

    // 3. Preenche a senha da administração
    await page.fill('input[name="password"]', ADMIN_PASSWORD);

    // 4. Clica no botão de entrar
    await page.click('button[type="submit"]');

    // 5. Confirma que entrou com sucesso no painel administrativo
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator('h1', { hasText: 'Painel Administrativo' })).toBeVisible();
  });

  test('Deve orientar o usuário quando um produto não existe mais', async ({ page }) => {
    await page.goto('/produtos/00000000-0000-4000-8000-000000000000');

    await expect(page.getByRole('heading', { name: 'Este garimpo não está mais disponível' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Voltar para a vitrine' })).toHaveAttribute('href', '/');
  });

});

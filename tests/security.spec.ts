import { test, expect } from '@playwright/test';

// ⚠️ Coloque exatamente a senha real que está no seu arquivo .env da aplicação
const ADMIN_SENHA_REAL = process.env.ADMIN_PASSWORD || '123456'; 

test.describe('Testes de Segurança e Blindagem - Desapego da Mila', () => {
  // ... mesmos testes anteriores
  
  test('3. Deve validar se o cookie de sessão do Admin possui travas de segurança (HttpOnly)', async ({ context, page }) => {
    await page.goto('/admin/login');

    await page.fill('input[name="password"]', ADMIN_SENHA_REAL);
    await page.click('button[type="submit"]');

    // Agora a senha confere e o redirecionamento para /admin ocorrerá com sucesso
    await expect(page).toHaveURL('/admin');

    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'admin_session');

    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.httpOnly).toBe(true);
    expect(sessionCookie?.sameSite).toBe('Lax');
  });
});
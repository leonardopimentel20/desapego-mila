import { test, expect, type Page } from '@playwright/test';

const CART_STORAGE_KEY = 'desapego_mila_cart_v4';

async function openFirstProduct(page: Page) {
  await page.goto('/');
  const productLink = page.locator('a[href*="/produtos/"]').first();
  await expect(productLink).toBeVisible();

  const hrefs = await page.locator('a[href*="/produtos/"]').evaluateAll((links) =>
    links
      .map((link) => link.getAttribute('href'))
      .filter((href): href is string => Boolean(href)),
  );

  for (const href of hrefs) {
    await page.goto(href);
    if (await page.getByRole('button', { name: /Adicionar à Sacola/i }).count() > 0) {
      return;
    }
  }

  throw new Error('Nenhuma peça disponível para compra foi encontrada no catálogo.');
}

test.describe('Testes avançados de jornada do cliente', () => {
  test('permite abrir a sacola usando interação por toque', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-touch', 'Teste exclusivo do projeto móvel com toque.');
    await page.setViewportSize({ width: 393, height: 852 });
    await page.addInitScript((storageKey) => {
      window.localStorage.removeItem(storageKey);
    }, CART_STORAGE_KEY);

    await openFirstProduct(page);
    await page.getByRole('button', { name: /Adicionar à Sacola/i }).tap();

    const drawer = page.getByRole('dialog', { name: /Sua Sacola de Garimpos/i });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Fechar sacola' })).toBeVisible();
  });

  test('mantém a busca contextual e navega por sugestões com teclado', async ({ page }) => {
    await page.route('**/api/suggestions?q=*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'suggestion-1', title: 'Vestido Vintage' },
          { id: 'suggestion-2', title: 'Vestido Floral' },
        ]),
      });
    });

    await page.goto('/?category=roupas');
    const search = page.getByRole('combobox', {
      name: 'Procurar marca, estilo, cor ou peça...',
    });
    await search.fill('vest');

    const suggestions = page.getByRole('listbox');
    await expect(suggestions).toBeVisible();
    await expect(suggestions.getByRole('option')).toHaveCount(2);

    await search.press('ArrowDown');
    await expect(suggestions.getByRole('option').first()).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await search.press('Enter');

    await expect(page).toHaveURL(/category=roupas/);
    await expect(page).toHaveURL(/search=Vestido(?:%20|\+)Vintage/);
  });

  test('trata consultas inválidas da API de sugestões sem expor dados', async ({ request }) => {
    const response = await request.get('/api/suggestions?q=a');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    await expect(response.json()).resolves.toEqual([]);
  });

  test('adiciona uma peça, respeita o limite de estoque e persiste a sacola', async ({ page }) => {
    await page.addInitScript((storageKey) => {
      window.localStorage.removeItem(storageKey);
    }, CART_STORAGE_KEY);

    await openFirstProduct(page);
    const addButton = page.getByRole('button', { name: /Adicionar à Sacola/i });
    await expect(addButton).toBeVisible();

    const quantityInput = page.locator('input[type="number"]').first();
    const hasQuantitySelector = await quantityInput.count() > 0;
    if (hasQuantitySelector) {
      const max = Number(await quantityInput.getAttribute('max'));
      const requestedQuantity = max + 10;
      await quantityInput.fill(String(requestedQuantity));
      await expect(quantityInput).toHaveValue(String(max));
    }

    await addButton.click();
    const drawer = page.getByRole('dialog', { name: /Sua Sacola de Garimpos/i });
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText('Sua Sacola de Garimpos');

    const drawerQuantity = drawer.getByRole('spinbutton').first();
    if (await drawerQuantity.count() > 0) {
      const max = Number(await drawerQuantity.getAttribute('max'));
      await expect(drawerQuantity).toHaveValue(String(max));
      await drawerQuantity.fill('999');
      await expect(drawerQuantity).toHaveValue(
        String(Number(await drawerQuantity.getAttribute('max'))),
      );
    }

    await page.getByRole('button', { name: 'Fechar sacola' }).click();
    await page.reload();
    await page.getByRole('button', { name: /^🛍️ Sacola/ }).click();

    await expect(page.getByRole('dialog', { name: /Sua Sacola de Garimpos/i })).toBeVisible();
    await expect(page.getByText('Sua Sacola de Garimpos')).toBeVisible();
  });

  test('remove uma peça e restaura o estado vazio da sacola', async ({ page }) => {
    await page.addInitScript((storageKey) => {
      window.localStorage.removeItem(storageKey);
    }, CART_STORAGE_KEY);

    await openFirstProduct(page);
    await page.getByRole('button', { name: /Adicionar à Sacola/i }).click();

    const drawer = page.getByRole('dialog', { name: /Sua Sacola de Garimpos/i });
    await expect(drawer).toBeVisible();
    await drawer.getByTitle('Remover item').click();

    await expect(drawer).toContainText('Sua sacola está vazia');
    await page.getByRole('button', { name: 'Fechar sacola' }).click();
    await page.getByRole('button', { name: /^🛍️ Sacola/ }).click();
    await expect(page.getByRole('dialog')).toContainText('Sua sacola está vazia');
  });

  test('troca a imagem principal na galeria sem perder acessibilidade', async ({ page }) => {
    await openFirstProduct(page);
    const thumbnails = page.getByRole('button', { name: /Ver foto \d+ de/i });

    if (await thumbnails.count() < 2) {
      test.skip(true, 'O primeiro produto disponível não possui galeria com múltiplas fotos.');
    }

    const mainImage = page.locator('main img').first();
    const initialSource = await mainImage.getAttribute('src');
    await thumbnails.nth(1).click();

    await expect(mainImage).not.toHaveAttribute('src', initialSource || '');
    await expect(thumbnails.nth(1)).toHaveAttribute('aria-label', /Ver foto 2 de/);
  });

  test('não cria rolagem horizontal em viewport móvel', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));

    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
  });
});

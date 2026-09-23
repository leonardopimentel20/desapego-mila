import assert from "node:assert/strict";
import { test } from "node:test";
import { quoteShipping, geocodeShippingAddress } from "../../src/shipping/geoapify";
import { calculateShippingFee, defaultShippingSettings, parseMoneyCents, ShippingError, validateShippingSettings, type ShippingSettings } from "../../src/shipping/pricing";
import { deliverySummary } from "../../src/whatsapp/delivery";

const settings: ShippingSettings = {
  ...defaultShippingSettings, enabled: true, originStreet: "Rua de Teste", originNumber: "10", originNeighborhood: "Centro",
  minimumFeeCents: 1000, perKmCents: 250,
};
const address = { street: "Rua de Teste", number: "10", neighborhood: "Centro, Joinville" };
const building = {
  street: "Rua de Teste", housenumber: "10", city: "Joinville", state: "Santa Catarina", country_code: "br",
  lat: -26.30, lon: -48.85, result_type: "building", formatted: "Rua de Teste 10, Joinville - SC, Brasil",
  rank: { confidence: 1, confidence_street_level: 1 },
};

function mockApi(responses: unknown[]) {
  const urls: URL[] = [];
  const credits: number[] = [];
  const options = {
    apiKey: "test-key",
    reserveCredits: async (amount: number) => { credits.push(amount); },
    fetcher: (async (input: string | URL | Request) => {
      urls.push(new URL(String(input)));
      assert.ok(responses.length > 0, "Consulta extra inesperada");
      const response = responses.shift();
      return response instanceof Response ? response : Response.json(response);
    }) as typeof fetch,
  };
  return { options, urls, credits };
}

test("modo desativado mantém R$ 30 sem chave e sem chamar Geoapify", async () => {
  const api = mockApi([]);
  assert.deepEqual(await quoteShipping(defaultShippingSettings, address, { ...api.options, apiKey: "" }), { fee: 30 });
  assert.equal(api.urls.length, 0);
  assert.equal(api.credits.length, 0);
});

test("cálculo proporcional em centavos respeita mínimo sem somá-lo", () => {
  assert.equal(calculateShippingFee(1000, settings), 10);
  assert.equal(calculateShippingFee(4500, settings), 11.25);
  assert.equal(calculateShippingFee(4567, settings), 11.42);
  for (const distance of [NaN, Infinity, -1, 400001]) assert.throws(() => calculateShippingFee(distance, settings), ShippingError);
});

test("configuração rejeita valores ausentes, negativos ou inválidos", () => {
  assert.equal(parseMoneyCents("2,50"), 250);
  assert.equal(parseMoneyCents("0"), 0);
  for (const value of ["", "-1", "NaN", "1e3", "0.001", "10000"]) assert.equal(parseMoneyCents(value), null);
  for (const overrides of [{ perKmCents: 0 }, { perKmCents: null }, { minimumFeeCents: -1 }, { originNumber: "" }, { originLatitude: -26.3, originLongitude: null }]) {
    assert.throws(() => validateShippingSettings({ ...settings, ...overrides }), ShippingError);
  }
  assert.doesNotThrow(() => validateShippingSettings(defaultShippingSettings));
});

test("endereço localizado apenas na cidade, em outra rua ou ambíguo não gera cotação", async () => {
  const variants = [
    [{ ...building, result_type: "city" }], [{ ...building, city: "Araquari" }],
    [{ ...building, street: "Rua Errada" }], [{ ...building, housenumber: "11" }],
    [{ ...building, rank: { confidence: 0.25, confidence_street_level: 1 } }],
    [building, { ...building, lat: -26.31 }], [], [{ ...building, lat: null }],
  ];
  for (const results of variants) {
    const api = mockApi([{ results }]);
    await assert.rejects(geocodeShippingAddress(address, api.options), (error: unknown) => error instanceof ShippingError && error.code === "address");
  }
});

test("rota de motocicleta retorna distância e taxa; só envia endereço ao provedor", async () => {
  const api = mockApi([{ results: [building] }, { results: [building] }, { results: [{ distance: 4500, distance_units: "meters" }] }]);
  const quote = await quoteShipping(settings, address, api.options);
  assert.equal(quote.fee, 11.25);
  assert.equal(quote.distanceMeters, 4500);
  assert.equal(quote.destination, building.formatted);
  assert.equal(api.urls[2].searchParams.get("mode"), "motorcycle");
  assert.equal(api.urls[2].searchParams.get("units"), "metric");
  assert.deepEqual(api.credits, [1, 1, 2]);
  assert.equal(api.urls[2].searchParams.get("waypoints")?.split("|").length, 2);
});

test("ida e volta usa rota completa, sem simplesmente dobrar a distância", async () => {
  const api = mockApi([{ results: [building] }, { results: [{ distance: 9700, distance_units: "meters" }] }]);
  const quote = await quoteShipping({ ...settings, roundTrip: true, originLatitude: -26.31, originLongitude: -48.86 }, address, api.options);
  assert.equal(quote.fee, 24.25);
  assert.equal(quote.roundTrip, true);
  assert.equal(api.urls[1].searchParams.get("waypoints"), "-26.31,-48.86|-26.3,-48.85|-26.31,-48.86");
  assert.deepEqual(api.credits, [1, 4]);
});

test("API fora do ar, limite excedido ou JSON inválido não viram frete fixo ou gratuito", async () => {
  for (const response of [new Response("erro", { status: 500 }), new Response("limite", { status: 429 }), new Response("chave", { status: 403 }), new Response("nao-json")]) {
    const api = mockApi([response]);
    await assert.rejects(quoteShipping(settings, address, api.options), ShippingError);
  }
  const api = mockApi([]);
  await assert.rejects(quoteShipping(settings, address, { ...api.options, reserveCredits: async () => { throw new ShippingError("quota"); } }), ShippingError);
  assert.equal(api.urls.length, 0);
});

test("falha de rede não expõe chave ou endereço na mensagem de erro", async () => {
  const api = mockApi([]);
  await assert.rejects(quoteShipping(settings, address, { ...api.options, fetcher: async () => { throw new Error("test-key ENDERECO_PRIVADO"); } }), (error: unknown) => {
    assert.ok(error instanceof ShippingError);
    assert.equal(String(error).includes("test-key"), false);
    assert.equal(String(error).includes("ENDERECO_PRIVADO"), false);
    return true;
  });
});

test("rota inválida, com pedágio ou balsa exige conferência manual", async () => {
  for (const route of [{ distance: -1 }, { distance: 500000 }, { distance: "500" }, { distance: 500, toll: true }, { distance: 500, ferry: true }, { distance: 500, distance_units: "miles" }]) {
    const api = mockApi([{ results: [building] }, { results: [building] }, { results: [{ distance_units: "meters", ...route }] }]);
    await assert.rejects(quoteShipping(settings, address, api.options), ShippingError);
  }
});

test("resumo exibe cotação, endereço encontrado e atribuição sem anunciar taxa fixa", () => {
  const summary = deliverySummary({ ...address, recipient: "Cliente", phone: "+5547999999999", complement: "", reference: "" }, {
    fee: 12.5, distanceMeters: 5000, destination: building.formatted, roundTrip: false,
  });
  assert.ok(summary.includes("R$ 12,50"));
  assert.ok(summary.includes("5 km"));
  assert.ok(summary.includes(building.formatted));
  assert.ok(summary.includes("https://www.geoapify.com/"));
  assert.equal(summary.includes("Taxa fixa"), false);
});

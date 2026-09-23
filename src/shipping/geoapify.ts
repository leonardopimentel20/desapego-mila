import { calculateShippingFee, FIXED_DELIVERY_FEE, hasOriginCoordinates, ShippingError, validateShippingSettings, type ShippingQuote, type ShippingSettings } from "./pricing";

type Address = { street: string; number: string; neighborhood: string };
type Point = { lat: number; lon: number; formatted: string };
type GeoapifyOptions = { apiKey: string; reserveCredits: (credits: number) => Promise<void>; fetcher?: typeof fetch };

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function normalize(value: unknown) {
  return typeof value === "string" ? value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "") : "";
}

function streetName(value: unknown) {
  return normalize(typeof value === "string" ? value.trim().replace(/^(rua|r\.?|avenida|av\.?|travessa|estrada|alameda)\s+/i, "") : "");
}

async function request(path: string, params: Record<string, string>, credits: number, options: GeoapifyOptions): Promise<unknown> {
  if (!options.apiKey.trim()) throw new ShippingError("configuration");
  await options.reserveCredits(credits);
  const url = new URL(path, "https://api.geoapify.com");
  url.search = new URLSearchParams({ ...params, apiKey: options.apiKey }).toString();
  try {
    const response = await (options.fetcher || fetch)(url, { signal: AbortSignal.timeout(10000), cache: "no-store", redirect: "error" });
    if (response.status === 429) throw new ShippingError("quota");
    if (response.status === 401 || response.status === 403) throw new ShippingError("configuration");
    if (!response.ok) throw new ShippingError("unavailable");
    return await response.json();
  } catch (error) {
    // Não propagar URLs, chave ou conteúdo da resposta para logs ou para o cliente.
    if (error instanceof ShippingError) throw error;
    throw new ShippingError("unavailable");
  }
}

export async function geocodeShippingAddress(address: Address, options: GeoapifyOptions): Promise<Point> {
  if (!/\d/.test(address.number)) throw new ShippingError("address");
  const payload = await request("/v1/geocode/search", {
    text: `${address.street}, ${address.number}, ${address.neighborhood}, Joinville, Santa Catarina, Brasil`,
    format: "json", filter: "countrycode:br", lang: "pt", limit: "3",
  }, 1, options);
  if (!record(payload) || !Array.isArray(payload.results)) throw new ShippingError("address");
  const matches = payload.results.filter(record).filter((item) => {
    const rank = record(item.rank) ? item.rank : {};
    return normalize(item.city) === "joinville" && item.country_code === "br"
      && (normalize(item.state) === "santacatarina" || item.state_code === "SC")
      && normalize(item.housenumber) === normalize(address.number)
      && streetName(item.street) === streetName(address.street)
      && (item.result_type === "building" || item.result_type === "amenity")
      && typeof rank.confidence === "number" && rank.confidence >= 0.9
      && typeof rank.confidence_street_level === "number" && rank.confidence_street_level >= 0.9
      && typeof item.lat === "number" && Number.isFinite(item.lat) && Math.abs(item.lat) <= 90
      && typeof item.lon === "number" && Number.isFinite(item.lon) && Math.abs(item.lon) <= 180
      && typeof item.formatted === "string" && item.formatted.length <= 500;
  });
  if (matches.length !== 1) throw new ShippingError("address");
  const match = matches[0];
  return { lat: match.lat as number, lon: match.lon as number, formatted: match.formatted as string };
}

export async function quoteShipping(settings: ShippingSettings, destination: Address, options: GeoapifyOptions): Promise<ShippingQuote> {
  if (!settings.enabled) return { fee: FIXED_DELIVERY_FEE };
  validateShippingSettings(settings);
  const origin = hasOriginCoordinates(settings)
    ? { lat: settings.originLatitude!, lon: settings.originLongitude!, formatted: "" }
    : await geocodeShippingAddress({ street: settings.originStreet, number: settings.originNumber, neighborhood: settings.originNeighborhood }, options);
  const target = await geocodeShippingAddress(destination, options);
  const points = [origin, target, ...(settings.roundTrip ? [origin] : [])];
  const payload = await request("/v1/routing", {
    waypoints: points.map((point) => `${point.lat},${point.lon}`).join("|"),
    mode: "motorcycle", type: "short", units: "metric", format: "json",
  }, settings.roundTrip ? 4 : 2, options);
  const route = record(payload) && Array.isArray(payload.results) && record(payload.results[0]) ? payload.results[0] : null;
  if (!route || route.distance_units !== "meters" || typeof route.distance !== "number"
    || !Number.isFinite(route.distance) || route.distance < 0 || route.distance > (settings.roundTrip ? 400000 : 200000)
    || route.ferry === true || route.toll === true) throw new ShippingError("route");
  const distanceMeters = Math.round(route.distance);
  return { fee: calculateShippingFee(distanceMeters, settings), distanceMeters, roundTrip: settings.roundTrip, destination: target.formatted };
}

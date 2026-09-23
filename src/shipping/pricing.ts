export const FIXED_DELIVERY_FEE = 30;

export interface ShippingSettings {
  enabled: boolean;
  originStreet: string;
  originNumber: string;
  originNeighborhood: string;
  originLatitude: number | null;
  originLongitude: number | null;
  minimumFeeCents: number | null;
  perKmCents: number | null;
  roundTrip: boolean;
}

export interface ShippingQuote {
  fee: number;
  distanceMeters?: number;
  roundTrip?: boolean;
  destination?: string;
}

export const defaultShippingSettings: ShippingSettings = {
  enabled: false, originStreet: "", originNumber: "", originNeighborhood: "",
  originLatitude: null, originLongitude: null,
  minimumFeeCents: null, perKmCents: null, roundTrip: false,
};

export class ShippingError extends Error {
  constructor(public readonly code: "configuration" | "address" | "unavailable" | "quota" | "route") {
    const messages = {
      configuration: "Configure a chave Geoapify, o endereço de saída e os valores do frete antes de ativar.",
      address: "Não foi possível localizar um endereço completo e único em Joinville/SC. Confira rua, número e bairro.",
      unavailable: "O serviço de mapas está indisponível. Tente novamente mais tarde.",
      quota: "O limite de consultas de frete foi atingido. A Mila precisa conferir esta entrega manualmente.",
      route: "Não foi possível obter um trajeto adequado para esta entrega. A Mila precisa conferir o frete.",
    };
    super(messages[code]);
    this.name = "ShippingError";
  }
}

export function parseMoneyCents(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d{1,4}(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function validateShippingSettings(settings: ShippingSettings) {
  const fields = [settings.originStreet, settings.originNumber, settings.originNeighborhood];
  if (fields.some((value) => /[\u0000-\u001f\u007f]/.test(value))
    || settings.originStreet.length > 255 || settings.originNumber.length > 30 || settings.originNeighborhood.length > 120) {
    throw new ShippingError("configuration");
  }
  if (!settings.enabled) return;
  if ((settings.originLatitude !== null || settings.originLongitude !== null) && !hasOriginCoordinates(settings)) {
    throw new ShippingError("configuration");
  }
  if (fields.some((value) => !value.trim()) || !/\d/.test(settings.originNumber)
    || !Number.isSafeInteger(settings.minimumFeeCents) || settings.minimumFeeCents! < 0 || settings.minimumFeeCents! > 999999
    || !Number.isSafeInteger(settings.perKmCents) || settings.perKmCents! <= 0 || settings.perKmCents! > 999999) {
    throw new ShippingError("configuration");
  }
}

export function hasOriginCoordinates(settings: ShippingSettings) {
  // Limite amplo da região; o administrador deve informar o ponto exato em Joinville.
  return typeof settings.originLatitude === "number" && Number.isFinite(settings.originLatitude)
    && settings.originLatitude >= -26.6 && settings.originLatitude <= -25.9
    && typeof settings.originLongitude === "number" && Number.isFinite(settings.originLongitude)
    && settings.originLongitude >= -49.3 && settings.originLongitude <= -48.4;
}

// O mínimo é um piso, não uma taxa adicional. A distância já inclui a volta, se solicitada.
export function calculateShippingFee(distanceMeters: number, settings: ShippingSettings) {
  validateShippingSettings({ ...settings, enabled: true });
  if (!Number.isSafeInteger(distanceMeters) || distanceMeters < 0 || distanceMeters > 400000) {
    throw new ShippingError("route");
  }
  const cents = Math.max(settings.minimumFeeCents!, Math.round(distanceMeters * settings.perKmCents! / 1000));
  if (cents > 99999999) throw new ShippingError("route");
  return cents / 100;
}

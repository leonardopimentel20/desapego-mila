import { FIXED_DELIVERY_FEE, type ShippingQuote } from "../shipping/pricing.js";

export const deliveryFields = ["neighborhood", "recipient", "street", "number", "phone", "complement", "reference"] as const;
export type DeliveryField = typeof deliveryFields[number];
export type DeliveryDetails = Record<DeliveryField, string>;
export type DeliveryDraft = Partial<DeliveryDetails>;

export const deliveryPrompts: Record<DeliveryField, string> = {
  neighborhood: "Qual é o seu bairro e cidade?",
  recipient: "Qual é o nome completo de quem vai receber a entrega?",
  street: "Qual é o endereço da entrega (rua ou avenida)?",
  number: "Qual é o número da residência? Se não tiver número, envie *sem número*.",
  phone: "Qual é o telefone de contato para a entrega, com DDD? Exemplo: (11) 99999-9999.",
  complement: "Tem complemento (apartamento, bloco, casa)? Envie o complemento ou *pular*.",
  reference: "Tem um ponto de referência para ajudar o entregador? Envie a referência ou *pular*.",
};

const limits: Record<DeliveryField, number> = {
  neighborhood: 120, recipient: 255, street: 255, number: 30, phone: 30, complement: 255, reference: 255,
};

export function validateDeliveryField(field: DeliveryField, input: string): { value: string; error?: never } | { error: string; value?: never } {
  const value = input.replace(/[\r\n\t]+/g, " ").trim();
  if (!value || value === "[comprovante enviado]" || /[\u0000-\u001f\u007f]/.test(value) || value.length > limits[field]) {
    return { error: `Envie uma resposta em texto com até ${limits[field]} caracteres.\n${deliveryPrompts[field]}` };
  }
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if ((field === "complement" || field === "reference") && /^(pular|nao|nenhum|nenhuma|sem)$/.test(normalized)) return { value: "" };
  if (field === "phone") {
    const digits = value.replace(/\D/g, "");
    const local = digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits;
    if (!/^[+\d\s().-]+$/.test(value) || !/^[1-9]{2}(?:[2-5]\d{7}|9\d{8})$/.test(local)) {
      return { error: "Telefone inválido. Envie um telefone brasileiro com DDD, por exemplo: (11) 99999-9999." };
    }
    return { value: `+55${local}` };
  }
  return { value };
}

export function isCompleteDelivery(draft: DeliveryDraft | undefined): draft is DeliveryDetails {
  return !!draft && deliveryFields.every((field) => {
    const value = draft[field];
    if (typeof value !== "string") return false;
    if ((field === "complement" || field === "reference") && value === "") return true;
    return !validateDeliveryField(field, value).error;
  });
}

export function deliverySummary(details: DeliveryDetails, quote: ShippingQuote = { fee: FIXED_DELIVERY_FEE }) {
  const fee = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(quote.fee).replace(/\u00a0/g, " ");
  return [
    `Destinatário: ${details.recipient}`,
    `Telefone: ${details.phone}`,
    `Endereço: ${details.street}, ${details.number}`,
    `Bairro e cidade: ${details.neighborhood}`,
    `Complemento: ${details.complement || "Não informado"}`,
    `Referência: ${details.reference || "Não informada"}`,
    ...(quote.distanceMeters === undefined ? [`Taxa fixa de entrega: ${fee}`] : [
      `Endereço localizado no mapa: ${quote.destination}`,
      `Distância do trajeto (${quote.roundTrip ? "ida e volta" : "ida"}): ${(quote.distanceMeters / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} km`,
      `Frete: ${fee}`,
      "Confira também o endereço localizado no mapa antes de confirmar.",
      "Powered by Geoapify: https://www.geoapify.com/",
      "© OpenStreetMap contributors: https://www.openstreetmap.org/copyright",
    ]),
    "", "Está correto?", "1️⃣ Sim", "2️⃣ Corrigir dados",
  ].join("\n");
}

import assert from "node:assert/strict";
import { test } from "node:test";
import { deliverySummary, isCompleteDelivery, validateDeliveryField, type DeliveryDetails } from "../../src/whatsapp/delivery";
import { getAutomaticReply } from "../../src/whatsapp/menu";

const details: DeliveryDetails = {
  neighborhood: "Centro, São Paulo", recipient: "Ana Silva", street: "Rua das Flores",
  number: "12 A", phone: "+5511999999999", complement: "", reference: "Ao lado da padaria",
};

test("telefone aceita DDD e formatos locais ou com código do Brasil", () => {
  for (const phone of ["(11) 99999-9999", "11999999999", "+55 (11) 99999-9999"]) {
    assert.equal(validateDeliveryField("phone", phone).value, "+5511999999999");
  }
  assert.equal(validateDeliveryField("phone", "(11) 3456-7890").value, "+551134567890");
});

test("telefone rejeita número incompleto, letras, DDD inválido e identificador de WhatsApp", () => {
  for (const phone of ["99999-9999", "(00) 99999-9999", "abc11999999999", "123456789012345", "11999999999@s.whatsapp.net"]) {
    assert.ok(validateDeliveryField("phone", phone).error);
  }
});

test("campos respeitam limites do banco e rejeitam mensagens sem texto", () => {
  assert.ok(validateDeliveryField("neighborhood", "a".repeat(121)).error);
  assert.ok(validateDeliveryField("street", "a".repeat(256)).error);
  assert.ok(validateDeliveryField("number", "a".repeat(31)).error);
  assert.ok(validateDeliveryField("recipient", " ").error);
  assert.ok(validateDeliveryField("street", "[comprovante enviado]").error);
  assert.ok(validateDeliveryField("reference", "rua\u0000teste").error);
  assert.equal(validateDeliveryField("street", "  Rua das Flores\nCentro  ").value, "Rua das Flores Centro");
});

test("complemento e referência podem ser pulados; residência aceita sem número", () => {
  assert.equal(validateDeliveryField("complement", "pular").value, "");
  assert.equal(validateDeliveryField("reference", "não").value, "");
  assert.equal(validateDeliveryField("number", "sem número").value, "sem número");
});

test("entrega só está completa após todas as respostas, incluindo opcionais", () => {
  assert.equal(isCompleteDelivery(undefined), false);
  assert.equal(isCompleteDelivery({ neighborhood: "Centro" }), false);
  assert.equal(isCompleteDelivery({ ...details, phone: "123" }), false);
  assert.equal(isCompleteDelivery({ ...details, street: "" }), false);
  assert.equal(isCompleteDelivery({ ...details, reference: undefined }), false);
  assert.equal(isCompleteDelivery({ ...details, reference: "" }), true);
});

test("conferência apresenta os dados completos e permite correção antes do pagamento", () => {
  const summary = deliverySummary(details);
  for (const value of [details.recipient, details.phone, details.street, details.number, details.neighborhood, details.reference, "Não informado", "R$ 30,00", "Corrigir dados"]) {
    assert.ok(summary.includes(value));
  }
});

test("menu e atendimento existentes continuam com as mesmas transições", () => {
  assert.equal(getAutomaticReply("menu", "https://example.com", "selling").nextState, "menu");
  assert.equal(getAutomaticReply("1", "https://example.com").text.includes("https://example.com"), true);
  assert.equal(getAutomaticReply("2", "https://example.com").nextState, "reservation");
  assert.equal(getAutomaticReply("3", "https://example.com").nextState, "selling");
  assert.equal(getAutomaticReply("vestido azul", "https://example.com", "reservation").nextState, "reservation");
});

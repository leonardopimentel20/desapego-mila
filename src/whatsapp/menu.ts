export function normalizeMessage(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function getAutomaticReply(text: string, storeUrl: string) {
  const normalized = normalizeMessage(text);

  if (/^(oi|ola|olá|bom dia|boa tarde|boa noite|menu|inicio|início)$/.test(normalized)) {
    return [
      "Olá! 👋 Eu sou o atendimento automático do Desapego da Mila.",
      "",
      "Como posso ajudar?",
      "1️⃣ Ver a vitrine",
      "2️⃣ Fazer uma reserva",
      "3️⃣ Saber como vender peças",
      "4️⃣ Falar com a Mila",
      "",
      "Responda com o número da opção desejada.",
    ].join("\n");
  }

  if (normalized === "1") {
    return `🛍️ Acesse a vitrine do Desapego da Mila:\n${storeUrl}`;
  }

  if (normalized === "2") {
    return "📦 Para fazer uma reserva, envie o nome da peça e a quantidade desejada. Nossa equipe confirmará a disponibilidade.";
  }

  if (normalized === "3") {
    return "💰 Para vender suas peças, envie fotos, descrição, tamanho e o valor que gostaria de receber. A Mila retornará assim que possível.";
  }

  if (normalized === "4") {
    return "💬 Sua mensagem foi encaminhada para o atendimento. A Mila falará com você assim que estiver disponível.";
  }

  return [
    "Não consegui identificar essa opção. 🙂",
    "",
    "Digite *menu* para ver as opções de atendimento.",
  ].join("\n");
}

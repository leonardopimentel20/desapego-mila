export function normalizeMessage(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export type ConversationState = "menu" | "reservation" | "selling";

export interface AutomaticReply {
  text: string;
  nextState: ConversationState;
}

export function getAutomaticReply(
  text: string,
  storeUrl: string,
  state: ConversationState = "menu",
): AutomaticReply {
  const normalized = normalizeMessage(text);

  if (/^(oi|ola|olá|bom dia|boa tarde|boa noite|menu|inicio|início)$/.test(normalized)) {
    return {
      text: [
      "Olá! 👋 Eu sou o atendimento automático do Desapego da Mila.",
      "",
      "Como posso ajudar?",
      "1️⃣ Ver a vitrine",
      "2️⃣ Fazer uma reserva",
      "3️⃣ Saber como vender peças",
      "4️⃣ Falar com a Mila",
      "",
      "Responda com o número da opção desejada.",
      ].join("\n"),
      nextState: "menu",
    };
  }

  if (normalized === "1") {
    return {
      text: `🛍️ Acesse a vitrine do Desapego da Mila:\n${storeUrl}`,
      nextState: "menu",
    };
  }

  if (normalized === "2") {
    return {
      text: "📦 Vamos fazer sua reserva. Envie agora o nome da peça e a quantidade desejada. Nossa equipe confirmará a disponibilidade.",
      nextState: "reservation",
    };
  }

  if (normalized === "3") {
    return {
      text: "💰 Envie fotos, descrição, tamanho e o valor que gostaria de receber. Para concluir ou voltar ao menu, digite *menu*.",
      nextState: "selling",
    };
  }

  if (normalized === "4") {
    return {
      text: "💬 Sua mensagem foi encaminhada para o atendimento. A Mila falará com você assim que estiver disponível.",
      nextState: "menu",
    };
  }

  if (state === "reservation") {
    return {
      text: `✅ Recebi seu pedido de reserva:\n\n“${text.trim()}”\n\nA Mila vai verificar a disponibilidade e confirmar pelo WhatsApp. Se quiser enviar outra peça, basta escrever os detalhes; para voltar ao início, digite *menu*.`,
      nextState: "reservation",
    };
  }

  if (state === "selling") {
    return {
      text: `✅ Recebi as informações da peça:\n\n“${text.trim()}”\n\nA Mila vai analisar e responder pelo WhatsApp. Para voltar ao início, digite *menu*.`,
      nextState: "selling",
    };
  }

  return {
    text: [
      "Não consegui identificar essa opção. 🙂",
      "",
      "Digite *menu* para ver as opções de atendimento.",
    ].join("\n"),
    nextState: "menu",
  };
}

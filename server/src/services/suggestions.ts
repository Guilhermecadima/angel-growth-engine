export function replySuggestions(text: string) {
  const cleaned = text.trim();
  if (!cleaned) return [];
  const question = cleaned.includes('?');
  return [
    question ? `Boa pergunta — obrigado por comentares. Vou pegar nisso num próximo conteúdo 👀` : `Obrigado pelo apoio! Qual foi a parte que curtiste mais?`,
    `Agradeço mesmo o comentário 🙌 Estou a tentar melhorar cada publicação.`,
    `Obrigado! Se tiveres uma sugestão para o próximo conteúdo, manda.`
  ];
}

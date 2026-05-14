export const normalizeFlashcardsPayload = (payload) => {
  const cards = Array.isArray(payload)
    ? payload
    : (Array.isArray(payload?.flashcards) ? payload.flashcards : [])
  return cards.filter(card =>
    card &&
    typeof card === 'object' &&
    typeof card.front === 'string' &&
    card.front.trim().length > 0 &&
    typeof card.back === 'string' &&
    card.back.trim().length > 0
  )
}

export const normalizeChatHistoryPayload = (payload) => {
  const messages = Array.isArray(payload)
    ? payload
    : (
      Array.isArray(payload?.history)
        ? payload.history
        : (
          Array.isArray(payload?.messages)
            ? payload.messages
            : (Array.isArray(payload?.chatbot_history) ? payload.chatbot_history : [])
        )
    )
  return messages.filter(msg =>
    msg &&
    typeof msg === 'object' &&
    (msg.role === 'user' || msg.role === 'assistant') &&
    typeof msg.content === 'string' &&
    msg.content.trim().length > 0
  )
}

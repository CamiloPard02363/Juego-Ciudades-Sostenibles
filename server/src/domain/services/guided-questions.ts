import { createHash, randomUUID } from 'node:crypto';

type Card = { cardId: string; label: string };
export type GuidedQuestion = { id: string; text: string; cardIds: string[] };
export type PendingQuestion = GuidedQuestion & { requestId: string; askerId: string; deadline: number };
export type GuidedMessage = { userId: string; displayName: string; text: string; sentAt: number };
export interface GuidedState {
  phase: string;
  cards: Card[];
  players: { userId: string; secretCardId: string | null; discardedCardIds: string[] }[];
  activePlayerUserId: string | null;
  turnDeadline: number | null;
  pendingQuestion?: PendingQuestion | null;
  guidedChat?: GuidedMessage[];
}

const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Only public, deterministic data. Never classify arbitrary pictures or infer unknown traits. */
export function questionsFor(state: GuidedState, userId: string): GuidedQuestion[] {
  const player = state.players.find(p => p.userId === userId);
  if (!player || state.phase !== 'PLAYING') return [];
  const cards = state.cards.filter(c => !player.discardedCardIds.includes(c.cardId));
  const candidates = [
    ...['a', 'e', 'i', 'o', 'u'].map(letter => ({ text: `¿El nombre de tu tarjeta contiene la letra ${letter.toUpperCase()}?`, test: (c: Card) => normalize(c.label).includes(letter) })),
    { text: '¿El nombre de tu tarjeta empieza por una vocal?', test: (c: Card) => /^[aeiou]/.test(normalize(c.label.trim())) },
    { text: '¿El nombre de tu tarjeta tiene más de una palabra?', test: (c: Card) => /\s/.test(c.label.trim()) },
  ].map(q => ({ text: q.text, cardIds: cards.filter(q.test).map(c => c.cardId) }));
  candidates.push({ text: '¿Tu tarjeta está en este grupo?', cardIds: cards.slice(0, Math.ceil(cards.length / 2)).map(c => c.cardId) });
  return candidates.filter(q => q.cardIds.length > 0 && q.cardIds.length < cards.length).map(q => ({
    ...q, id: createHash('sha256').update(JSON.stringify(q)).digest('hex').slice(0, 24),
  }));
}

export function currentQuestion(state: GuidedState, now = Date.now()): PendingQuestion | null {
  const q = state.pendingQuestion;
  return q && state.phase === 'PLAYING' && state.activePlayerUserId === q.askerId && state.turnDeadline === q.deadline && now < q.deadline ? q : null;
}

export function addGuidedMessage(state: GuidedState, userId: string, displayName: string, text: unknown) {
  if (!state.players.some(p => p.userId === userId)) throw new Error('No estás en esta partida.');
  if (typeof text !== 'string' || !text.trim()) throw new Error('Escribe un mensaje.');
  state.guidedChat = [...(state.guidedChat ?? []), { userId, displayName, text: text.trim().slice(0, 500), sentAt: Date.now() }].slice(-80);
}

export function askGuidedQuestion(state: GuidedState, userId: string, name: string, questionId: unknown) {
  if (state.phase !== 'PLAYING' || state.activePlayerUserId !== userId || !state.turnDeadline || Date.now() >= state.turnDeadline) throw new Error('Solo puedes preguntar durante tu turno.');
  if (currentQuestion(state)) throw new Error('Espera la respuesta de tu rival.');
  const question = questionsFor(state, userId).find(q => q.id === questionId);
  if (!question) throw new Error('La pregunta cambió al descartar. Elige una sugerencia actual.');
  state.pendingQuestion = { ...question, requestId: randomUUID(), askerId: userId, deadline: state.turnDeadline };
  addGuidedMessage(state, userId, name, question.text);
}

export function answerGuidedQuestion(state: GuidedState, userId: string, name: string, requestId: unknown, answer: unknown) {
  const q = currentQuestion(state);
  if (!q || q.requestId !== requestId) throw new Error('La pregunta ya no está activa.');
  if (typeof answer !== 'boolean') throw new Error('Responde Sí o No.');
  const responder = state.players.find(p => p.userId === userId && p.userId !== q.askerId);
  const asker = state.players.find(p => p.userId === q.askerId);
  if (!responder || !asker || !responder.secretCardId) throw new Error('Solo el rival puede responder.');
  if (q.cardIds.includes(responder.secretCardId) !== answer) throw new Error('Revisa tu tarjeta secreta: esa respuesta no coincide.');
  const discarded = state.cards.filter(c => !asker.discardedCardIds.includes(c.cardId) && q.cardIds.includes(c.cardId) !== answer);
  // Atomic update; repeats and late answers cannot discard again.
  asker.discardedCardIds.push(...discarded.map(c => c.cardId));
  state.pendingQuestion = null;
  addGuidedMessage(state, userId, name, `${answer ? 'Sí' : 'No'}. ${discarded.length} tarjeta${discarded.length === 1 ? '' : 's'} descartada${discarded.length === 1 ? '' : 's'} automáticamente.`);
}

export function guidedView(state: GuidedState, userId: string) {
  return { suggestedQuestions: questionsFor(state, userId), pendingQuestion: currentQuestion(state), guidedChat: state.guidedChat ?? [] };
}

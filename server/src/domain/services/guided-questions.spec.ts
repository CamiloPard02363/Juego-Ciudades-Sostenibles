import { afterEach, describe, expect, it, vi } from 'vitest';
import { addGuidedMessage, answerGuidedQuestion, askGuidedQuestion, currentQuestion, guidedView, questionsFor, type GuidedState } from './guided-questions.js';

function state(): GuidedState {
  return { phase: 'PLAYING', cards: ['Canadá', 'Japón', 'Perú', 'Chile', 'Grecia', 'Suecia'].map((label, i) => ({ cardId: String(i), label })),
    players: [{ userId: 'a', secretCardId: '0', discardedCardIds: [] }, { userId: 'b', secretCardId: '2', discardedCardIds: [] }], activePlayerUserId: 'a', turnDeadline: Date.now() + 30000 };
}
afterEach(() => vi.useRealTimers());
describe('preguntas guiadas autoritativas', () => {
  it('normaliza acentos y no consulta la identidad secreta para sugerir preguntas', () => {
    const s = state(), questions = questionsFor(s, 'a');
    expect(questions.find(q => q.text.includes('letra A'))?.cardIds).toContain('0');
    s.players[1].secretCardId = '5';
    expect(questionsFor(s, 'a')).toEqual(questions);
    expect(questionsFor(s, 'intruso')).toEqual([]);
  });
  it.each([true, false])('aplica Sí/No (%s) una sola vez al tablero correcto', answer => {
    const s = state();
    const q = questionsFor(s, 'a').find(q => q.text.includes('letra A'))!;
    s.players[1].secretCardId = answer ? '0' : '2';
    askGuidedQuestion(s, 'a', 'Ana', q.id);
    const request = s.pendingQuestion!.requestId;
    answerGuidedQuestion(s, 'b', 'Luis', request, answer);
    expect(s.players[0].discardedCardIds).toEqual(s.cards.filter(c => q.cardIds.includes(c.cardId) !== answer).map(c => c.cardId));
    expect(s.players[1].discardedCardIds).toEqual([]);
    expect(s.players[0].discardedCardIds).not.toContain(s.players[1].secretCardId);
    expect(() => answerGuidedQuestion(s, 'b', 'Luis', request, answer)).toThrow();
    expect(s.activePlayerUserId).toBe('a');
  });
  it('rechaza falsificaciones, auto-respuesta y respuestas incorrectas sin cambiar descartes', () => {
    const s = state(), q = questionsFor(s, 'a')[0];
    expect(() => askGuidedQuestion(s, 'b', 'Luis', q.id)).toThrow();
    expect(() => askGuidedQuestion(s, 'intruso', 'X', q.id)).toThrow();
    expect(() => askGuidedQuestion(s, 'a', 'Ana', 'inventada')).toThrow();
    askGuidedQuestion(s, 'a', 'Ana', q.id);
    const id = s.pendingQuestion!.requestId;
    expect(() => askGuidedQuestion(s, 'a', 'Ana', q.id)).toThrow();
    expect(() => answerGuidedQuestion(s, 'a', 'Ana', id, false)).toThrow();
    expect(() => answerGuidedQuestion(s, 'intruso', 'X', id, false)).toThrow();
    expect(() => answerGuidedQuestion(s, 'b', 'Luis', id, 'No')).toThrow();
    expect(() => answerGuidedQuestion(s, 'b', 'Luis', id, true)).toThrow();
    expect(s.players[0].discardedCardIds).toEqual([]);
    expect(currentQuestion(s)?.requestId).toBe(id);
  });
  it('vence por reloj, cambio de turno, final y revancha', () => {
    vi.useFakeTimers();
    const s = state(); askGuidedQuestion(s, 'a', 'Ana', questionsFor(s, 'a')[0].id);
    const id = s.pendingQuestion!.requestId;
    s.activePlayerUserId = 'b'; expect(currentQuestion(s)).toBeNull();
    s.activePlayerUserId = 'a'; s.phase = 'FINISHED'; expect(currentQuestion(s)).toBeNull();
    s.phase = 'PLAYING'; s.turnDeadline! += 1; expect(currentQuestion(s)).toBeNull();
    s.turnDeadline! -= 1; vi.advanceTimersByTime(31000);
    expect(() => answerGuidedQuestion(s, 'b', 'Luis', id, false)).toThrow();
    expect(s.players[0].discardedCardIds).toEqual([]);
  });
  it('respeta descartes manuales previos y ofrece grupos cuando no hay atributos útiles', () => {
    const s = state(); s.cards.forEach(c => c.label = 'Tarjeta');
    s.players[0].discardedCardIds = ['5'];
    const qs = questionsFor(s, 'a'); expect(qs).toHaveLength(1);
    askGuidedQuestion(s, 'a', 'Ana', qs[0].id);
    answerGuidedQuestion(s, 'b', 'Luis', s.pendingQuestion!.requestId, true);
    expect(s.players[0].discardedCardIds).toEqual(['5', '3', '4']);
    expect(new Set(s.players[0].discardedCardIds).size).toBe(3);
  });
  it('el chat libre no descarta y limita el historial y longitud', () => {
    const s = state();
    for (let i = 0; i < 90; i++) addGuidedMessage(s, 'a', 'Ana', 'Sí'.repeat(500));
    expect(s.guidedChat).toHaveLength(80); expect(s.guidedChat![0].text).toHaveLength(500);
    expect(s.players[0].discardedCardIds).toEqual([]);
    expect(() => addGuidedMessage(s, 'intruso', 'X', 'hola')).toThrow();
    expect(JSON.stringify(guidedView(s, 'a'))).not.toContain('secretCardId');
  });
});

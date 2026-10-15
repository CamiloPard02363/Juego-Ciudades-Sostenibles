import { describe, expect, it } from 'vitest';
import { cutTextAtBoundary, extractJsonObject } from './json-extraction.js';

describe('extractJsonObject', () => {
  it('lee un JSON limpio', () => {
    expect(extractJsonObject('{"a":1,"b":[1,2]}')).toEqual({ a: 1, b: [1, 2] });
  });

  it('lee un JSON con espacios y saltos de línea alrededor', () => {
    expect(extractJsonObject('\n\n  {"a":1}  \n')).toEqual({ a: 1 });
  });

  it('lee un JSON dentro de una valla de markdown, con o sin la etiqueta json', () => {
    expect(extractJsonObject('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJsonObject('```\n{"a":2}\n```')).toEqual({ a: 2 });
    expect(extractJsonObject('Claro:\n```JSON\n{"a":3}\n```\nListo.')).toEqual({ a: 3 });
  });

  it('lee el objeto aunque haya texto antes y después', () => {
    expect(extractJsonObject('Aquí tienes el resultado: {"content":[1]} espero que sirva.')).toEqual({ content: [1] });
  });

  it('lee objetos anidados con llaves dentro de cadenas', () => {
    expect(extractJsonObject('x {"a":{"b":"}"}} y')).toEqual({ a: { b: '}' } });
  });

  it('devuelve undefined si no hay forma de sacar un JSON válido', () => {
    expect(extractJsonObject('')).toBeUndefined();
    expect(extractJsonObject('   ')).toBeUndefined();
    expect(extractJsonObject('no hay nada')).toBeUndefined();
    expect(extractJsonObject('{"a": 1')).toBeUndefined();
    expect(extractJsonObject('{a: 1}')).toBeUndefined();
  });

  it('un null literal sí es JSON válido y se distingue de "no se pudo leer"', () => {
    expect(extractJsonObject('null')).toBeNull();
  });
});

describe('cutTextAtBoundary', () => {
  it('devuelve el texto tal cual si ya cabe', () => {
    expect(cutTextAtBoundary('hola mundo', 100)).toEqual({ text: 'hola mundo', truncated: false });
    expect(cutTextAtBoundary('12345', 5)).toEqual({ text: '12345', truncated: false });
  });

  it('prefiere cortar en un salto de párrafo cercano al límite', () => {
    const text = `${'a'.repeat(85)}\n\n${'b'.repeat(50)}`;
    const result = cutTextAtBoundary(text, 100);
    expect(result.truncated).toBe(true);
    expect(result.text).toBe('a'.repeat(85));
  });

  it('si no hay salto de párrafo, corta al final de una oración', () => {
    const text = `${'a'.repeat(88)}. ${'b'.repeat(50)}`;
    const result = cutTextAtBoundary(text, 100);
    expect(result.text).toBe(`${'a'.repeat(88)}.`);
  });

  it('si el único límite natural está muy lejos, corta duro en el máximo', () => {
    const text = `${'a'.repeat(10)}\n\n${'b'.repeat(200)}`;
    const result = cutTextAtBoundary(text, 100);
    expect(result.truncated).toBe(true);
    expect(result.text.length).toBeLessThanOrEqual(100);
    expect(result.text.length).toBeGreaterThan(90);
  });

  it('nunca devuelve más de maxChars', () => {
    const result = cutTextAtBoundary('palabra '.repeat(1_000), 500);
    expect(result.text.length).toBeLessThanOrEqual(500);
  });
});

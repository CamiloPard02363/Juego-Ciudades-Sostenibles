import { describe, expect, it } from 'vitest';
import { Subject } from './subject.entity.js';

function createRoot(): Subject {
  return Subject.create({
    id: 'root-1',
    name: 'Matemáticas',
    slug: 'matematicas',
    creatorUserId: 'admin-1',
  });
}

function createSub(creatorUserId = 'owner-1'): Subject {
  const sub = Subject.create({
    id: 'sub-1',
    name: 'Álgebra',
    slug: 'algebra',
    parentSubjectId: 'root-1',
    creatorUserId,
  });
  return sub;
}

describe('Subject.canBeDeletedBy', () => {
  describe('sub-materia PRIVATE (regla histórica, sin cambios)', () => {
    it('la borra su creador, sin importar isEmpty', () => {
      const sub = createSub('owner-1');
      expect(sub.canBeDeletedBy('owner-1', false, false)).toBe(true);
    });

    it('la borra un admin que no es el creador', () => {
      const sub = createSub('owner-1');
      expect(sub.canBeDeletedBy('admin-2', true, false)).toBe(true);
    });

    it('no la borra un usuario que no es ni creador ni admin', () => {
      const sub = createSub('owner-1');
      expect(sub.canBeDeletedBy('stranger', false, true)).toBe(false);
    });
  });

  describe('sub-materia PUBLIC (nueva excepción a la irreversibilidad)', () => {
    it('la borra su creador si el árbol está vacío', () => {
      const sub = createSub('owner-1');
      sub.publish();
      expect(sub.canBeDeletedBy('owner-1', false, true)).toBe(true);
    });

    it('la borra un admin si el árbol está vacío', () => {
      const sub = createSub('owner-1');
      sub.publish();
      expect(sub.canBeDeletedBy('admin-2', true, true)).toBe(true);
    });

    it('NO la borra su creador si el árbol tiene juegos', () => {
      const sub = createSub('owner-1');
      sub.publish();
      expect(sub.canBeDeletedBy('owner-1', false, false)).toBe(false);
    });

    it('publish() sigue siendo irreversible: publicar de nuevo lanza error', () => {
      const sub = createSub('owner-1');
      sub.publish();
      expect(() => sub.publish()).toThrowError();
    });
  });

  describe('materia raíz (siempre PUBLIC, nueva regla admin-only)', () => {
    it('la borra un admin si el árbol está vacío', () => {
      const root = createRoot();
      expect(root.canBeDeletedBy('admin-1', true, true)).toBe(true);
    });

    it('NO la borra un usuario no-admin, aunque el árbol esté vacío', () => {
      const root = createRoot();
      expect(root.canBeDeletedBy('someone', false, true)).toBe(false);
    });

    it('NO la borra un admin si el árbol tiene juegos', () => {
      const root = createRoot();
      expect(root.canBeDeletedBy('admin-1', true, false)).toBe(false);
    });
  });
});

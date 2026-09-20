import { describe, expect, it } from 'vitest';
import { User } from './user.entity.js';
import { Email } from '../value-objects/email.vo.js';
import { Password } from '../value-objects/password.vo.js';
import { PersonName } from '../value-objects/person-name.vo.js';
import { InvalidUserStateError } from '../errors/user.errors.js';

function buildUser(): User {
  return User.create({
    id: 'user-1',
    email: Email.create('ana@example.com'),
    password: Password.fromHash('hashed'),
    name: PersonName.create('Ana', 'García'),
  });
}

describe('User.changeBirthDate', () => {
  it('acepta una fecha de nacimiento válida en el pasado', () => {
    const user = buildUser();
    const birthDate = new Date('2018-05-10');

    user.changeBirthDate(birthDate);

    expect(user.birthDate).toEqual(birthDate);
  });

  it('rechaza una fecha futura', () => {
    const user = buildUser();
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    expect(() => user.changeBirthDate(nextYear)).toThrow(InvalidUserStateError);
  });

  it('rechaza una fecha de más de 120 años atrás', () => {
    const user = buildUser();
    const tooOld = new Date();
    tooOld.setFullYear(tooOld.getFullYear() - 121);

    expect(() => user.changeBirthDate(tooOld)).toThrow(InvalidUserStateError);
  });
});

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListOrganizationsQueryDto } from './list-organizations-query.dto.js';

/**
 * Regresión de bug reportado por Manuel: el filtro de estado "Inactivas" en
 * `/organizacion` no filtraba nada. Causa raíz: `@Type(() => Boolean)` sobre
 * un query param interpreta cualquier string no vacío (incluido "false")
 * como `true` — `Boolean("false") === true` en JS. El DTO debe simular
 * exactamente cómo Nest entrega los query params: SIEMPRE como string, nunca
 * como booleano real, por eso se usa `plainToInstance` con `isActive: 'false'`
 * (string), no `isActive: false` (booleano).
 */
describe('ListOrganizationsQueryDto', () => {
  it('interpreta isActive=false (string, como llega del query string) como false', async () => {
    const dto = plainToInstance(ListOrganizationsQueryDto, { isActive: 'false' });

    expect(dto.isActive).toBe(false);

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('interpreta isActive=true (string) como true', async () => {
    const dto = plainToInstance(ListOrganizationsQueryDto, { isActive: 'true' });

    expect(dto.isActive).toBe(true);

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('deja isActive undefined cuando no viene en el query', async () => {
    const dto = plainToInstance(ListOrganizationsQueryDto, {});

    expect(dto.isActive).toBeUndefined();

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

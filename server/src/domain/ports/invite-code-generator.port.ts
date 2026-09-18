export const INVITE_CODE_GENERATOR = Symbol('INVITE_CODE_GENERATOR');

/** Genera códigos de invitación estáticos (issue #101) — no rotan una vez asignados a una Class. */
export interface InviteCodeGenerator {
  generate(): string;
}

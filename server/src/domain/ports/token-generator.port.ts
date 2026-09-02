export const TOKEN_GENERATOR = Symbol('TOKEN_GENERATOR');

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface TokenGenerator {
  generate(payload: TokenPayload): Promise<string>;
}

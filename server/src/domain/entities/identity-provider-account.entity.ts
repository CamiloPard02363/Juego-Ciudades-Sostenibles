export type AuthProviderName = 'GOOGLE' | 'MICROSOFT';

export interface IdentityProviderAccountProps {
  id: string;
  userId: string;
  provider: AuthProviderName;
  providerUserId: string;
  emailAtLinking: string;
  createdAt: Date;
}

export interface CreateIdentityProviderAccountProps {
  id: string;
  userId: string;
  provider: AuthProviderName;
  providerUserId: string;
  emailAtLinking: string;
}

/**
 * Identidad externa vinculada a un `User` (issue #197). Un usuario puede
 * tener 0, 1 o N de estas (una por proveedor) — el vínculo real que evita
 * duplicados es el constraint único `(provider, providerUserId)` en
 * persistencia, no algo que esta entidad valide en memoria.
 */
export class IdentityProviderAccount {
  private props: IdentityProviderAccountProps;

  private constructor(props: IdentityProviderAccountProps) {
    this.props = props;
  }

  static create(props: CreateIdentityProviderAccountProps): IdentityProviderAccount {
    return new IdentityProviderAccount({ ...props, createdAt: new Date() });
  }

  static fromPersistence(props: IdentityProviderAccountProps): IdentityProviderAccount {
    return new IdentityProviderAccount(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get provider(): AuthProviderName {
    return this.props.provider;
  }

  get providerUserId(): string {
    return this.props.providerUserId;
  }

  get emailAtLinking(): string {
    return this.props.emailAtLinking;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toPersistence(): IdentityProviderAccountProps {
    return { ...this.props };
  }
}

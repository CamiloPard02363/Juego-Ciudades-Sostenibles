import { InvalidOrganizationNameError } from '../errors/organization.errors.js';
import { EmailDomain } from '../value-objects/email-domain.vo.js';

export interface OrganizationProps {
  id: string;
  name: string;
  /** `null` = organización sin dominio reclamado (no hace auto-join en signup/login). */
  domain: EmailDomain | null;
  createdByUserId: string;
  createdAt: Date;
  /**
   * Desactivada = no admite nuevas matrículas ni auto-join, conserva
   * historial (issue #106, CA2.3). Campo propio, no derivado — decisión de
   * producto confirmada por Manuel.
   */
  isActive: boolean;
}

export interface CreateOrganizationProps {
  id: string;
  name: string;
  domain?: string | null;
  createdByUserId: string;
}

const MIN_NAME_LENGTH = 3;

export class Organization {
  private props: OrganizationProps;

  private constructor(props: OrganizationProps) {
    this.props = props;
  }

  static create(props: CreateOrganizationProps): Organization {
    const name = props.name.trim();

    if (name.length < MIN_NAME_LENGTH) {
      throw new InvalidOrganizationNameError(
        `debe tener al menos ${MIN_NAME_LENGTH} caracteres.`,
      );
    }

    return new Organization({
      id: props.id,
      name,
      domain: props.domain ? EmailDomain.create(props.domain) : null,
      createdByUserId: props.createdByUserId,
      createdAt: new Date(),
      isActive: true,
    });
  }

  static fromPersistence(props: OrganizationProps): Organization {
    return new Organization(props);
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get domain(): EmailDomain | null {
    return this.props.domain;
  }

  get createdByUserId(): string {
    return this.props.createdByUserId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  deactivate(): void {
    this.props.isActive = false;
  }

  reactivate(): void {
    this.props.isActive = true;
  }

  rename(newName: string): void {
    const name = newName.trim();

    if (name.length < MIN_NAME_LENGTH) {
      throw new InvalidOrganizationNameError(
        `debe tener al menos ${MIN_NAME_LENGTH} caracteres.`,
      );
    }

    this.props.name = name;
  }

  toPersistence(): OrganizationProps {
    return { ...this.props };
  }
}

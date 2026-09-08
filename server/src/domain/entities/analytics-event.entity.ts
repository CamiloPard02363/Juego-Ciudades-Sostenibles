export type AnalyticsEventType = 'game_opened' | 'section_viewed' | 'room_created';

export interface AnalyticsEventProps {
  id: string;
  type: AnalyticsEventType;
  userId: string;
  gameId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

/** Evento de uso crudo para analítica de negocio (BI). Sin lógica más allá de sus datos. */
export class AnalyticsEvent {
  private constructor(private readonly props: AnalyticsEventProps) {}

  static create(props: Omit<AnalyticsEventProps, 'id' | 'createdAt'>): AnalyticsEvent {
    return new AnalyticsEvent({
      ...props,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    });
  }

  static fromPersistence(props: AnalyticsEventProps): AnalyticsEvent {
    return new AnalyticsEvent(props);
  }

  get id(): string {
    return this.props.id;
  }

  get type(): AnalyticsEventType {
    return this.props.type;
  }

  get userId(): string {
    return this.props.userId;
  }

  get gameId(): string | null {
    return this.props.gameId;
  }

  get metadata(): Record<string, unknown> {
    return this.props.metadata;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}

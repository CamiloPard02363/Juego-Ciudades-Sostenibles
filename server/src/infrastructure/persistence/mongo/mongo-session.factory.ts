import { Injectable } from '@nestjs/common';
import type { TransactionRunner } from '../../../domain/ports/transaction-runner.port.js';
import { MongoService } from './mongo.service.js';

/**
 * Único punto del código que abre una sesión/transacción de Mongo. No es una
 * abstracción genérica de "unit of work" — hoy solo la usa
 * `ImportGamesBatchUseCase` (la única operación que realmente necesita que
 * varios documentos confirmen juntos; crear/editar/publicar un juego ya es
 * atómico por documento y no pasa por acá). Si en el futuro aparece un
 * segundo caso real, se generaliza entonces — no antes.
 */
@Injectable()
export class MongoSessionFactory implements TransactionRunner {
  constructor(private readonly mongo: MongoService) {}

  /**
   * Corre `work` dentro de una transacción con `session.withTransaction()`:
   * si `work` lanza, Mongo revierte todo lo escrito con esa sesión. La
   * sesión siempre se cierra (`endSession()`) incluso si `work` falla.
   */
  async run<T>(work: (session: unknown) => Promise<T>): Promise<T> {
    const session = this.mongo.getClient().startSession();
    try {
      let result!: T;
      await session.withTransaction(
        async () => {
          result = await work(session);
        },
        { readConcern: { level: 'majority' }, writeConcern: { w: 'majority' } },
      );
      return result;
    } finally {
      await session.endSession();
    }
  }
}

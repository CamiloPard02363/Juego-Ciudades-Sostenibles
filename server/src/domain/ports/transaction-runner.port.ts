export const TRANSACTION_RUNNER = Symbol('TRANSACTION_RUNNER');

/**
 * Corre `work` de forma atómica: todo lo que `work` escriba a través del
 * "handle" que recibe (un `session` opaco — este puerto no conoce Mongo)
 * confirma o se revierte como una sola unidad. Puerto deliberadamente
 * mínimo: hoy solo lo implementa `MongoSessionFactory` y solo lo usa
 * `ImportGamesBatchUseCase` — la única operación del código que necesita
 * que varios documentos confirmen juntos.
 */
export interface TransactionRunner {
  run<T>(work: (session: unknown) => Promise<T>): Promise<T>;
}

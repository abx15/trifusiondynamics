import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../modules/database/prisma.service';

/**
 * The transaction-scoped Prisma client handed to a callback by
 * `UnitOfWorkService.run()`.
 *
 * Rule enforced by review: inside a transaction callback NEVER call
 * `PrismaService` directly. Passing `tx` down to every collaborator is what
 * makes "ticket updated + assignment written + activity written + outbox event
 * written" genuinely atomic. A nested call on the root client would escape the
 * transaction and could commit (or roll back) independently, which is exactly
 * the class of bug this type exists to prevent.
 */
export type Tx = Prisma.TransactionClient;

/**
 * Accepts either the root client or an existing transaction client so services
 * can be composed into a larger transaction without special-casing.
 */
export type PrismaLike = Tx | PrismaService;

export type TransactionOptions = {
  timeout?: number;
  maxWait?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
};

@Injectable()
export class UnitOfWorkService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs `work` inside a single interactive transaction. The callback receives
   * a `tx` that MUST be used for every statement that belongs to the unit of
   * work. Nested calls are supported: if `tx` is passed in (i.e. this method is
   * invoked from within another transaction) the callback simply runs on the
   * existing transaction instead of opening a new one.
   */
  async run<T>(
    work: (tx: Tx) => Promise<T>,
    options?: TransactionOptions,
    existing?: Tx,
  ): Promise<T> {
    if (existing) {
      return work(existing);
    }

    return this.prisma.$transaction(async (tx) => work(tx), {
      timeout: options?.timeout ?? 15_000,
      maxWait: options?.maxWait ?? 5_000,
      isolationLevel: options?.isolationLevel,
    });
  }
}

/**
 * Normalises a Prisma-like client to a plain `Tx`. Useful for read helpers that
 * accept either the root client or a transaction client.
 */
export function asTx(client: PrismaLike): Tx {
  return client;
}

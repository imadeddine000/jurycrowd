import { PrismaClient } from '@prisma/client';

/**
 * Lazily-initialized Prisma client.
 *
 * A Proxy defers `new PrismaClient()` until the first DB access (not at module
 * load). This lets the CLI set `DATABASE_URL` before the client is created,
 * without refactoring every route that imports `prisma`. All existing
 * `prisma.<model>.<op>()` call sites keep working unchanged.
 */
let _client: PrismaClient | undefined;
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (!_client) _client = new PrismaClient();
    return Reflect.get(_client, prop, receiver);
  },
});

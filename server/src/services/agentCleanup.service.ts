import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { invalidateAgentCache } from './cache.service';

const retentionPeriodMs = 3 * 24 * 60 * 60 * 1000;

export async function permanentlyDeleteExpiredAgents(now = new Date()): Promise<number> {
  const expirationCutoff = new Date(now.getTime() - retentionPeriodMs);
  const deletedCount = await prisma.$transaction(async (transaction) => {
    const expiredAgents = await transaction.$queryRaw<{ id: string }[]>(
      Prisma.sql`
        SELECT "id"
        FROM "DeliveryAgent"
        WHERE "deletedAt" <= ${expirationCutoff}
        FOR UPDATE
      `,
    );

    if (expiredAgents.length === 0) return 0;

    await transaction.deliveryAgent.deleteMany({
      where: {
        id: { in: expiredAgents.map(({ id }) => id) },
        deletedAt: { lte: expirationCutoff },
      },
    });

    return expiredAgents.length;
  });

  if (deletedCount > 0) {
    await invalidateAgentCache();
  }

  return deletedCount;
}

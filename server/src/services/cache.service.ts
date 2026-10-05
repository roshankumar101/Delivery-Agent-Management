import { createHash } from 'node:crypto';
import { redisClient } from '../config/redis';

export type CacheStatus = 'HIT' | 'MISS' | 'BYPASS';

export interface CachedValue<T> {
  value: T;
  status: CacheStatus;
}

export function hashCacheQuery(query: unknown): string {
  return createHash('sha256').update(JSON.stringify(query)).digest('hex');
}

export async function getOrLoad<T>(
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>,
): Promise<CachedValue<T>> {
  if (!redisClient.isReady) {
    const value = await load();
    return { value, status: 'BYPASS' };
  }

  try {
    const cached = await redisClient.get(key);
    if (cached !== null) {
      return { value: JSON.parse(cached) as T, status: 'HIT' };
    }
  } catch (error) {
    console.error(`Redis read failed for cache key "${key}". Falling back to PostgreSQL.`, error);
    const value = await load();
    return { value, status: 'BYPASS' };
  }

  const value = await load();
  if (!redisClient.isReady) {
    return { value, status: 'BYPASS' };
  }

  try {
    await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
    return { value, status: 'MISS' };
  } catch (error) {
    console.error(`Redis write failed for cache key "${key}". Returning the PostgreSQL result.`, error);
    return { value, status: 'BYPASS' };
  }
}

async function deleteMatchingKeys(pattern: string): Promise<void> {
  if (!redisClient.isReady) return;

  let batch: string[] = [];
  try {
    for await (const key of redisClient.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      batch.push(key);
      if (batch.length === 100) {
        await redisClient.unlink(batch);
        batch = [];
      }
    }
    if (batch.length > 0) {
      await redisClient.unlink(batch);
    }
  } catch (error) {
    console.error(`Redis invalidation failed for keys matching "${pattern}".`, error);
  }
}

export async function invalidateAgentCache(agentId?: string): Promise<void> {
  const invalidations = [
    deleteMatchingKeys('agents:*'),
    deleteMatchingKeys('agents:stats'),
  ];

  if (agentId) {
    invalidations.push(deleteMatchingKeys(`agent:${agentId}`));
  } else {
    invalidations.push(deleteMatchingKeys('agent:*'));
  }

  await Promise.all(invalidations);
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
}

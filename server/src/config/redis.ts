import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error('REDIS_URL must be set before the server can initialize Redis.');
}

export const redisClient = createClient({
  ...(redisUrl ? { url: redisUrl } : {}),
  socket: {
    reconnectStrategy(retries) {
      if (retries > 10) {
        return new Error('Redis reconnection limit reached.');
      }
      return Math.min(retries * 250, 3000);
    },
  },
});

redisClient.on('error', (error) => {
  console.error('Redis client error:', error);
});

export async function connectRedis(): Promise<void> {
  if (!redisUrl) {
    console.warn('REDIS_URL is not configured; Redis caching is disabled and requests will use PostgreSQL.');
    return;
  }

  if (redisClient.isOpen) return;

  try {
    await redisClient.connect();
    console.info('Redis cache connected.');
  } catch (error) {
    console.error('Redis cache unavailable; requests will use PostgreSQL until Redis reconnects.', error);
  }
}

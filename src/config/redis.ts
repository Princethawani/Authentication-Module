import Redis from 'ioredis';
import { env } from './env';

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(env.REDIS_URL, {
      retryStrategy: (times) => {
        // Retry with exponential backoff, max 2 seconds
        return Math.min(times * 50, 2000);
      },
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    });

    _redis.on('connect', () => {
      console.log('Redis connected');
    });

    _redis.on('error', (err) => {
      console.error('Redis error:', err.message);
    });

    _redis.on('close', () => {
      console.log('Redis connection closed');
    });
  }

  return _redis;
}

export async function closeRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = null;
    console.log('Redis disconnected cleanly');
  }
}
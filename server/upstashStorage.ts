import { Redis } from '@upstash/redis';

// Default configuration with lazy fallback to credentials provided by user
const DEFAULT_URL = 'https://fond-koi-285614.upstash.io';
const DEFAULT_TOKEN = 'gQAAAAAABFuuAAIgcDE4MDFkODk4NWViZDU0ODllOGNhNDkzNmUyODY3ZWM3Mw';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!redisClient) {
    const url = process.env.UPSTASH_REDIS_REST_URL || DEFAULT_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || DEFAULT_TOKEN;

    if (url && token) {
      try {
        redisClient = new Redis({
          url,
          token,
        });
      } catch (err) {
        console.error('[Upstash Redis] Failed to initialize client:', err);
      }
    }
  }
  return redisClient;
}

/**
 * Health check & diagnostic test for Upstash Redis connectivity
 */
export async function testRedisHealth(): Promise<{ ok: boolean; message: string; latencyMs: number }> {
  const client = getRedisClient();
  if (!client) {
    return { ok: false, message: 'Redis client not configured or missing credentials', latencyMs: -1 };
  }
  const start = Date.now();
  try {
    const ping = await client.ping();
    const latencyMs = Date.now() - start;
    return { ok: ping === 'PONG', message: `Connected (Ping: ${ping})`, latencyMs };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Connection failed', latencyMs: Date.now() - start };
  }
}

/**
 * Save user's bot configurations array to Upstash Redis
 */
export async function saveUserBotsToRedis(userId: string, bots: any[]): Promise<boolean> {
  const client = getRedisClient();
  if (!client || !userId) return false;
  try {
    const key = `bots:user:${userId}`;
    await client.set(key, JSON.stringify(bots));
    return true;
  } catch (err) {
    console.error(`[Upstash Redis] Failed to save bots for user ${userId}:`, err);
    return false;
  }
}

/**
 * Fetch user's bot configurations array from Upstash Redis
 */
export async function fetchUserBotsFromRedis(userId: string): Promise<any[] | null> {
  const client = getRedisClient();
  if (!client || !userId) return null;
  try {
    const key = `bots:user:${userId}`;
    const data = await client.get(key);
    if (!data) return null;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
    if (Array.isArray(data)) {
      return data;
    }
    return null;
  } catch (err) {
    console.error(`[Upstash Redis] Failed to fetch bots for user ${userId}:`, err);
    return null;
  }
}

/**
 * Fetch all bot configurations across all users stored in Upstash Redis
 */
export async function fetchAllBotsFromRedis(): Promise<any[]> {
  const client = getRedisClient();
  if (!client) return [];
  try {
    const keys = await client.keys('bots:user:*');
    if (!keys || keys.length === 0) return [];
    
    const allBots: any[] = [];
    for (const key of keys) {
      try {
        const raw = await client.get(key);
        let parsed: any = raw;
        if (typeof raw === 'string') {
          parsed = JSON.parse(raw);
        }
        if (Array.isArray(parsed)) {
          allBots.push(...parsed);
        }
      } catch (err) {
        console.warn(`[Upstash Redis] Error reading key ${key}:`, err);
      }
    }
    return allBots;
  } catch (err) {
    console.error('[Upstash Redis] Failed to fetch all bots:', err);
    return [];
  }
}

/**
 * Save all general chat messages to Upstash Redis
 */
export async function saveGeneralChatToRedis(messages: any[]): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;
  try {
    const key = 'chat:general:messages';
    // Limit to latest 500 messages to maintain high performance
    const slim = messages.slice(-500);
    await client.set(key, JSON.stringify(slim));
    return true;
  } catch (err) {
    console.error('[Upstash Redis] Failed to save general chat:', err);
    return false;
  }
}

/**
 * Fetch all general chat messages from Upstash Redis
 */
export async function fetchGeneralChatFromRedis(): Promise<any[] | null> {
  const client = getRedisClient();
  if (!client) return null;
  try {
    const key = 'chat:general:messages';
    const data = await client.get(key);
    if (!data) return null;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
    if (Array.isArray(data)) {
      return data;
    }
    return null;
  } catch (err) {
    console.error('[Upstash Redis] Failed to fetch general chat:', err);
    return null;
  }
}

/**
 * Save all user accounts to Upstash Redis
 */
export async function saveUsersToRedis(users: any[]): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;
  try {
    const key = 'auth:users:all';
    await client.set(key, JSON.stringify(users));
    return true;
  } catch (err) {
    console.error('[Upstash Redis] Failed to save users:', err);
    return false;
  }
}

/**
 * Fetch all user accounts from Upstash Redis
 */
export async function fetchUsersFromRedis(): Promise<any[] | null> {
  const client = getRedisClient();
  if (!client) return null;
  try {
    const key = 'auth:users:all';
    const data = await client.get(key);
    if (!data) return null;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
    if (Array.isArray(data)) {
      return data;
    }
    return null;
  } catch (err) {
    console.error('[Upstash Redis] Failed to fetch users:', err);
    return null;
  }
}

/**
 * Save all active sessions to Upstash Redis
 */
export async function saveSessionsToRedis(sessions: Record<string, string>): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;
  try {
    const key = 'auth:sessions:all';
    await client.set(key, JSON.stringify(sessions));
    return true;
  } catch (err) {
    console.error('[Upstash Redis] Failed to save sessions:', err);
    return false;
  }
}

/**
 * Fetch all active sessions from Upstash Redis
 */
export async function fetchSessionsFromRedis(): Promise<Record<string, string> | null> {
  const client = getRedisClient();
  if (!client) return null;
  try {
    const key = 'auth:sessions:all';
    const data = await client.get(key);
    if (!data) return null;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
    if (typeof data === 'object') {
      return data as Record<string, string>;
    }
    return null;
  } catch (err) {
    console.error('[Upstash Redis] Failed to fetch sessions:', err);
    return null;
  }
}

/**
 * Save all quick tokens to Upstash Redis
 */
export async function saveQuickTokensToRedis(quickTokens: Record<string, any>): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;
  try {
    const key = 'auth:quick_tokens:all';
    await client.set(key, JSON.stringify(quickTokens));
    return true;
  } catch (err) {
    console.error('[Upstash Redis] Failed to save quick tokens:', err);
    return false;
  }
}

/**
 * Fetch all quick tokens from Upstash Redis
 */
export async function fetchQuickTokensFromRedis(): Promise<Record<string, any> | null> {
  const client = getRedisClient();
  if (!client) return null;
  try {
    const key = 'auth:quick_tokens:all';
    const data = await client.get(key);
    if (!data) return null;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
    if (typeof data === 'object') {
      return data as Record<string, any>;
    }
    return null;
  } catch (err) {
    console.error('[Upstash Redis] Failed to fetch quick tokens:', err);
    return null;
  }
}

/**
 * Save app settings to Upstash Redis
 */
export async function saveAppSettingsToRedis(settings: any): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;
  try {
    const key = 'settings:app:global';
    await client.set(key, JSON.stringify(settings));
    return true;
  } catch (err) {
    console.error('[Upstash Redis] Failed to save app settings:', err);
    return false;
  }
}

/**
 * Fetch app settings from Upstash Redis
 */
export async function fetchAppSettingsFromRedis(): Promise<any | null> {
  const client = getRedisClient();
  if (!client) return null;
  try {
    const key = 'settings:app:global';
    const data = await client.get(key);
    if (!data) return null;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
    return data;
  } catch (err) {
    console.error('[Upstash Redis] Failed to fetch app settings:', err);
    return null;
  }
}

import Redis from "ioredis";
import {
  RateLimiterMemory,
  RateLimiterRedis,
  RateLimiterRes,
  type RateLimiterAbstract,
} from "rate-limiter-flexible";

/**
 * Distributed rate limiting backed by the stack's own Redis.
 *
 * The Redis client lives here rather than in a shared `lib/redis.ts` because
 * rate limiting is its only consumer, and the connection options below are
 * tuned for that one job (see `enableOfflineQueue`). Give it a second consumer
 * and it is worth extracting; until then, keeping it here makes the blast
 * radius obvious.
 */

const globalForRedis = globalThis as unknown as {
  rateLimitRedis?: Promise<Redis>;
  rateLimitRedisDownUntil?: number;
};

/**
 * How long to stop dialling Redis after a failed connection attempt.
 *
 * Without this, every request during an outage pays `connectTimeout` before
 * falling back — turning a Redis blip into site-wide latency. One request per
 * cooldown probes; the rest go straight to the in-memory limiter.
 */
const CONNECT_COOLDOWN_MS = 10_000;

function connect(): Promise<Redis> {
  if (globalForRedis.rateLimitRedis) return globalForRedis.rateLimitRedis;

  if (Date.now() < (globalForRedis.rateLimitRedisDownUntil ?? 0)) {
    return Promise.reject(new Error("Redis unreachable, in connect cooldown"));
  }

  const url = process.env.REDIS_URL;
  if (!url) {
    // Deliberately not thrown at module load: `next build` imports every route
    // module to collect page data, and the build has no Redis. Callers treat a
    // rejection here as "fall back to the in-memory limiter".
    globalForRedis.rateLimitRedisDownUntil = Date.now() + CONNECT_COOLDOWN_MS;
    console.error("REDIS_URL is not set — rate limiting in memory only");
    return Promise.reject(new Error("REDIS_URL is not set"));
  }

  const client = new Redis(url, {
    // The connection is opened by the first `limit()` call, never at import
    // time — that is what keeps `next build` free of Redis env stubs.
    lazyConnect: true,
    // Fail a command outright while the socket is down instead of parking it in
    // the offline queue, so a Redis outage degrades to `insuranceLimiter`
    // rather than hanging the request that is waiting on it.
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    // Generous for a neighbour on the stack's internal network, and only ever
    // paid by the one request per cooldown that probes a down Redis.
    connectTimeout: 2_000,
  });

  // ioredis emits `error` on every failed reconnect attempt. An EventEmitter
  // with no `error` listener throws, which would take the server down during a
  // Redis outage — the exact moment it needs to stay up.
  client.on("error", (error: Error) => {
    console.error("Redis (rate limiting) connection error:", error.message);
  });

  const connection = client
    .connect()
    .then(() => {
      globalForRedis.rateLimitRedisDownUntil = 0;
      return client;
    })
    .catch((error: unknown) => {
      // Drop the cached promise so the next probe reconnects, but hold off for
      // the cooldown so only one request in that window pays the timeout.
      globalForRedis.rateLimitRedis = undefined;
      globalForRedis.rateLimitRedisDownUntil = Date.now() + CONNECT_COOLDOWN_MS;
      client.disconnect();
      throw error;
    });

  globalForRedis.rateLimitRedis = connection;
  return connection;
}

export interface RateLimitResult {
  /** `false` once the caller has spent its allowance for the current window. */
  success: boolean;
}

export interface RateLimiter {
  limit(key: string): Promise<RateLimitResult>;
}

interface RateLimiterConfig {
  /** Namespace for this limiter's Redis keys. */
  prefix: string;
  /** Actions allowed per `duration`. */
  points: number;
  /** Window length in seconds. */
  duration: number;
}

/**
 * Builds a limiter that keeps counting when Redis does not.
 *
 * Two layers of degradation, in order:
 *   1. `insuranceLimiter` — a per-process in-memory counter that takes over
 *      whenever the Redis command fails or the connection is not `ready`.
 *      Limits still apply; they are just enforced per container rather than
 *      across the fleet.
 *   2. Fail open — if even that throws, the request is allowed and the error is
 *      logged. A rate limiter must never be the reason sign-in returns a 500.
 *
 * Note this is a fixed window: the counter is set on the first hit and expires
 * `duration` seconds later. Worst case is a 2x burst straddling a window
 * boundary, which is immaterial at these limits.
 */
function defineRateLimiter({
  prefix,
  points,
  duration,
}: RateLimiterConfig): RateLimiter {
  const fallback = new RateLimiterMemory({
    keyPrefix: prefix,
    points,
    duration,
  });
  let limiter: RateLimiterAbstract | undefined;

  async function resolve(): Promise<RateLimiterAbstract> {
    if (limiter) return limiter;

    const storeClient = await connect();
    limiter ??= new RateLimiterRedis({
      storeClient,
      keyPrefix: prefix,
      points,
      duration,
      insuranceLimiter: fallback,
      // Skip the dead socket while ioredis is reconnecting and go straight to
      // `insuranceLimiter`, rather than waiting for the command to time out.
      rejectIfRedisNotReady: true,
    });
    return limiter;
  }

  return {
    async limit(key: string): Promise<RateLimitResult> {
      let target: RateLimiterAbstract;
      try {
        target = await resolve();
      } catch {
        // `connect()` already logged the cause, at most once per cooldown —
        // logging again here would emit a line per request during an outage.
        target = fallback;
      }

      try {
        await target.consume(key);
        return { success: true };
      } catch (rejection) {
        if (rejection instanceof RateLimiterRes) return { success: false };
        console.error(`Rate limiter "${prefix}" failed open:`, rejection);
        return { success: true };
      }
    },
  };
}

/**
 * Rate limiter for post email notifications
 *
 * Limit: 10 emails per hour
 * Prevents overwhelming the email service and ensures controlled delivery
 */
export const postCreationRateLimiter = defineRateLimiter({
  prefix: "post-creation",
  points: 10,
  duration: 60 * 60,
});

/**
 * Rate limiter for newsletter subscriptions
 *
 * Limit: 3 subscription/unsubscription actions per minute per user
 * Prevents abuse of newsletter subscription endpoints
 */
export const newsletterSubscriptionRateLimiter = defineRateLimiter({
  prefix: "newsletter",
  points: 3,
  duration: 60,
});

/**
 * Rate limiter for sign-in endpoint.
 *
 * Limit: 5 attempts per 60 seconds per IP
 * Mitigates brute-force and credential-stuffing attacks.
 */
export const signInRateLimiter = defineRateLimiter({
  prefix: "auth-sign-in",
  points: 5,
  duration: 60,
});

/**
 * Rate limiter for sign-up endpoint.
 *
 * Limit: 10 attempts per 60 minutes per IP
 * Prevents mass account-creation abuse.
 */
export const signUpRateLimiter = defineRateLimiter({
  prefix: "auth-sign-up",
  points: 10,
  duration: 60 * 60,
});

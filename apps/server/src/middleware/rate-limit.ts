import { createMiddleware } from "hono/factory";
import { errors } from "../lib/response";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

function getClientIp(c: { req: { header: (name: string) => string | undefined } }) {
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim();
  return (
    c.req.header("x-real-ip") ||
    c.req.header("cf-connecting-ip") ||
    "unknown"
  );
}

export function rateLimit(options?: {
  windowMs?: number;
  anonymousLimit?: number;
  authenticatedLimit?: number;
}) {
  const windowMs = options?.windowMs ?? 60_000;
  const anonymousLimit = options?.anonymousLimit ?? 60;
  const authenticatedLimit = options?.authenticatedLimit ?? 300;

  return createMiddleware(async (c, next) => {
    const ip = getClientIp(c);
    const isAuthenticated = !!c.req.header("authorization");
    const limit = isAuthenticated ? authenticatedLimit : anonymousLimit;
    const key = `${isAuthenticated ? "auth" : "anon"}:${ip}`;

    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
    } else {
      entry.count += 1;
      store.set(key, entry);
    }

    const current = store.get(key)!;
    const remaining = Math.max(0, limit - current.count);

    c.header("X-RateLimit-Limit", String(limit));
    c.header("X-RateLimit-Remaining", String(remaining));
    c.header("X-RateLimit-Reset", String(Math.ceil(current.resetAt / 1000)));

    if (current.count > limit) {
      c.header("Retry-After", String(Math.ceil((current.resetAt - now) / 1000)));
      return errors.rateLimited(c);
    }

    await next();
  });
}

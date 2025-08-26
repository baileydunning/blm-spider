type Key = string;
const buckets = new Map<Key, { reset: number; count: number }>();

export function rateLimit({
  key,
  windowMs = 15 * 60 * 1000,
  max = 100,
}: { key: string; windowMs?: number; max?: number; }) {
  const now = Date.now();
  const slot = Math.floor(now / windowMs);
  const id = `${key}:${slot}`;
  const b = buckets.get(id) ?? { reset: (slot + 1) * windowMs, count: 0 };
  b.count += 1;
  buckets.set(id, b);

  const remaining = Math.max(0, max - b.count);
  const headers = {
    "X-RateLimit-Limit": String(max),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(b.reset),
  };

  if (b.count > max) {
    return { blocked: true, headers };
  }
  return { blocked: false, headers };
}

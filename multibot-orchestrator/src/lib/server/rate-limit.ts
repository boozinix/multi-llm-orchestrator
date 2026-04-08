type Bucket = {
  hits: number[];
};

const buckets = new Map<string, Bucket>();

function nowMs(): number {
  return Date.now();
}

function trimOlderThan(arr: number[], minTs: number): number[] {
  let idx = 0;
  while (idx < arr.length && arr[idx] < minTs) idx++;
  return idx === 0 ? arr : arr.slice(idx);
}

/**
 * In-memory sliding-window limiter (best-effort). Works well for single runtime
 * process; in serverless multi-instance it is still useful but not global.
 */
export function hitRateLimit(key: string, limit: number, windowMs: number): {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
} {
  const now = nowMs();
  const minTs = now - windowMs;
  const existing = buckets.get(key) ?? { hits: [] };
  const hits = trimOlderThan(existing.hits, minTs);

  if (hits.length >= limit) {
    const oldest = hits[0] ?? now;
    return {
      allowed: false,
      remaining: 0,
      resetInMs: Math.max(0, windowMs - (now - oldest)),
    };
  }

  hits.push(now);
  buckets.set(key, { hits });
  return {
    allowed: true,
    remaining: Math.max(0, limit - hits.length),
    resetInMs: windowMs,
  };
}


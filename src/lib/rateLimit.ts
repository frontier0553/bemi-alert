/**
 * 간단한 인메모리 Rate Limiter
 * 동일 서버 인스턴스 내에서 과도한 요청 방지
 */

interface Bucket {
  count:     number;
  resetAt:   number;
}

const store = new Map<string, Bucket>();

/**
 * @param key     식별자 (userId + ':' + endpoint 등)
 * @param limit   윈도우 내 최대 요청 수
 * @param windowMs 윈도우 크기 (ms)
 * @returns true면 허용, false면 차단
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || now > bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;
  bucket.count++;
  return true;
}

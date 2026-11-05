/** fetch with a timeout and bounded retries on 429 / 5xx / network errors. Never logs request bodies or headers. */

export type Fetch = typeof fetch;

export interface RetryOptions {
  attempts?: number;
  timeoutMs?: number;
  baseDelayMs?: number;
  fetchImpl?: Fetch;
  sleep?: (ms: number) => Promise<void>;
}

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function fetchWithRetry(url: string, init: RequestInit = {}, opts: RetryOptions = {}): Promise<Response> {
  const attempts = opts.attempts ?? 3;
  const f = opts.fetchImpl ?? fetch;
  const sleep = opts.sleep ?? defaultSleep;
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 10_000);
    try {
      const res = await f(url, { ...init, signal: ctrl.signal });
      if (res.status !== 429 && res.status < 500) return res;
      last = new UpstreamError(`${new URL(url).host} answered ${res.status}`, res.status, true);
      if (i < attempts - 1) {
        const retryAfter = Number(res.headers.get("retry-after"));
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 30_000) : (opts.baseDelayMs ?? 500) * 2 ** i);
      }
    } catch (e) {
      last = e instanceof UpstreamError ? e : new UpstreamError(`${new URL(url).host} unreachable (${(e as Error).name})`, null, true);
      if (i < attempts - 1) await sleep((opts.baseDelayMs ?? 500) * 2 ** i);
    } finally {
      clearTimeout(timer);
    }
  }
  throw last instanceof UpstreamError ? last : new UpstreamError("request failed", null, true);
}

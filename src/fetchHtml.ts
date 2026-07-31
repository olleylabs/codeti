import {
  MAX_RETRIES,
  MIN_REQUEST_INTERVAL_MS,
  RATE_LIMIT_COOLDOWN_MS,
  REQUEST_TIMEOUT_MS,
  RETRY_BASE_DELAY_MS,
  USER_AGENT,
} from "./config.js";
import { readCache, writeCache } from "./cache.js";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class RateLimitedError extends Error {}
export class BlockedError extends Error {}

// Shared across all concurrent fetches so a 429 backs off every in-flight
// and future request, not just the one that received it.
let nextAllowedAt = 0;

// Once the site's bot-mitigation (e.g. a Cloudflare challenge) is detected,
// stop issuing further requests entirely instead of retrying/hammering a
// block that a plain HTTP client cannot solve.
let blocked = false;

export function isBlocked(): boolean {
  return blocked;
}

async function waitForSlot(): Promise<void> {
  const wait = nextAllowedAt - Date.now();
  nextAllowedAt = Math.max(nextAllowedAt, Date.now()) + MIN_REQUEST_INTERVAL_MS;
  if (wait > 0) await delay(wait);
}

async function doFetch(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    if (response.status === 403 && response.headers.has("cf-mitigated")) {
      blocked = true;
      throw new BlockedError(`Blocked by bot mitigation fetching ${url}`);
    }
    if (response.status === 429) {
      const retryAfterSeconds = Number(response.headers.get("retry-after"));
      const cooldownMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? retryAfterSeconds * 1000
        : RATE_LIMIT_COOLDOWN_MS;
      nextAllowedAt = Date.now() + cooldownMs;
      throw new RateLimitedError(`Rate limited (429) fetching ${url}`);
    }
    if (!response.ok) {
      throw new Error(`Request to ${url} failed with status ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

// Belt-and-suspenders: if the underlying connection never settles even after
// AbortController fires (observed in this sandbox), a plain timer race still
// lets the caller move on instead of hanging indefinitely.
async function fetchOnce(url: string): Promise<string> {
  await waitForSlot();
  return Promise.race([
    doFetch(url),
    new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error(`Timed out fetching ${url}`)), REQUEST_TIMEOUT_MS + 5_000);
    }),
  ]);
}

async function fetchWithRetry(url: string): Promise<string> {
  if (blocked) {
    throw new BlockedError(`Skipping ${url}: bot mitigation block already detected this run`);
  }
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetchOnce(url);
    } catch (error) {
      lastError = error;
      if (error instanceof BlockedError) break;
      if (attempt < MAX_RETRIES && !(error instanceof RateLimitedError)) {
        await delay(RETRY_BASE_DELAY_MS * 2 ** attempt);
      }
    }
  }
  throw lastError instanceof BlockedError
    ? lastError
    : new Error(`Failed to fetch ${url} after ${MAX_RETRIES + 1} attempts: ${String(lastError)}`);
}

export async function fetchHtmlCached(
  url: string,
  cacheDir: string,
  cacheKey: string,
  refresh: boolean,
): Promise<string> {
  if (!refresh) {
    const cached = await readCache(cacheDir, cacheKey);
    if (cached !== null) return cached;
  }
  const html = await fetchWithRetry(url);
  await writeCache(cacheDir, cacheKey, html);
  return html;
}

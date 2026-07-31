export const BASE_URL = "https://www.baseball-reference.com";

export const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");

export const DIRECTORY_CACHE_DIR = "data/raw/directories";
export const PLAYER_CACHE_DIR = "data/raw/players";
export const OUTPUT_PATH = "output/results.json";

export const REQUEST_TIMEOUT_MS = 15_000;
export const MAX_RETRIES = 5;
export const RETRY_BASE_DELAY_MS = 500;
export const CONCURRENCY = 2;
export const MIN_REQUEST_INTERVAL_MS = 400;
export const RATE_LIMIT_COOLDOWN_MS = 10_000;

export const USER_AGENT =
  "codeti-baseball-aggregator/1.0 (+https://github.com/; assessment task)";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

export function cachePathFor(dir: string, key: string): string {
  return path.join(dir, `${key}.html`);
}

export async function readCache(dir: string, key: string): Promise<string | null> {
  const filePath = cachePathFor(dir, key);
  if (!existsSync(filePath)) return null;
  return readFile(filePath, "utf8");
}

export async function writeCache(dir: string, key: string, html: string): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(cachePathFor(dir, key), html, "utf8");
}

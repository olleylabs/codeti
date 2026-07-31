import * as cheerio from "cheerio";
import { BASE_URL } from "./config.js";
import type { PlayerReference } from "./types.js";

function playerIdFromUrl(url: string): string {
  const match = url.match(/\/([^/]+)\.shtml$/i);
  if (!match) {
    throw new Error(`Unable to derive playerId from url: ${url}`);
  }
  return match[1] as string;
}

export function parseDirectoryPage(html: string): PlayerReference[] {
  const $ = cheerio.load(html);
  const players: PlayerReference[] = [];

  $("#div_players_ p a").each((_, element) => {
    const href = $(element).attr("href");
    const name = $(element).text().trim();
    if (!href || !name) return;
    const url = new URL(href, BASE_URL).toString();
    players.push({ name, url, playerId: playerIdFromUrl(url) });
  });

  return players;
}

export function dedupeByPlayerId(players: PlayerReference[]): PlayerReference[] {
  const seen = new Map<string, PlayerReference>();
  for (const player of players) {
    if (!seen.has(player.playerId)) {
      seen.set(player.playerId, player);
    }
  }
  return [...seen.values()];
}

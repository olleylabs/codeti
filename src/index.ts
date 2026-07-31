import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import pLimit from "p-limit";
import {
  BASE_URL,
  CONCURRENCY,
  DIRECTORY_CACHE_DIR,
  LETTERS,
  OUTPUT_PATH,
  PLAYER_CACHE_DIR,
} from "./config.js";
import { fetchHtmlCached, isBlocked } from "./fetchHtml.js";
import { dedupeByPlayerId, parseDirectoryPage } from "./directoryParser.js";
import { hasExactlyThreeAs } from "./nameFilter.js";
import { parseFaqQuestions } from "./playerParser.js";
import { aggregateQuestions } from "./aggregator.js";
import type { PlayerFaqResult, PlayerReference } from "./types.js";

const refresh = process.argv.includes("--refresh");

async function loadAllPlayers(): Promise<PlayerReference[]> {
  const all: PlayerReference[] = [];
  for (const letter of LETTERS) {
    const url = `${BASE_URL}/players/${letter}/`;
    const html = await fetchHtmlCached(url, DIRECTORY_CACHE_DIR, letter, refresh);
    all.push(...parseDirectoryPage(html));
  }
  return dedupeByPlayerId(all);
}

async function fetchPlayerFaq(player: PlayerReference): Promise<PlayerFaqResult> {
  const html = await fetchHtmlCached(player.url, PLAYER_CACHE_DIR, player.playerId, refresh);
  return { player, questions: parseFaqQuestions(html) };
}

async function main(): Promise<void> {
  console.log("Loading player directories (a-z)...");
  const allPlayers = await loadAllPlayers();
  console.log(`Found ${allPlayers.length} unique players across all directories.`);

  const matchingPlayers = allPlayers.filter((player) => hasExactlyThreeAs(player.name));
  console.log(`${matchingPlayers.length} players have exactly three occurrences of the letter "a".`);

  const limit = pLimit(CONCURRENCY);
  let completed = 0;
  const progressStep = Math.max(1, Math.round(matchingPlayers.length / 20));

  const settled = await Promise.allSettled(
    matchingPlayers.map((player) =>
      limit(async () => {
        try {
          return await fetchPlayerFaq(player);
        } finally {
          completed += 1;
          if (completed % progressStep === 0 || completed === matchingPlayers.length) {
            console.log(`  player pages: ${completed}/${matchingPlayers.length}`);
          }
        }
      }),
    ),
  );

  const results: PlayerFaqResult[] = [];
  const failures: { player: PlayerReference; error: unknown }[] = [];

  settled.forEach((outcome, index) => {
    const player = matchingPlayers[index] as PlayerReference;
    if (outcome.status === "fulfilled") {
      results.push(outcome.value);
    } else {
      failures.push({ player, error: outcome.reason });
    }
  });

  if (failures.length > 0) {
    if (isBlocked()) {
      console.error(
        `\nThe site's bot mitigation blocked this run after ${results.length} successful player page(s); ` +
          `${failures.length} page(s) were skipped as a result. Re-run later (or from a different network) — ` +
          "already-cached pages will not be re-fetched.",
      );
    } else {
      console.error(`\n${failures.length} player page(s) failed to fetch or parse:`);
      for (const { player, error } of failures) {
        console.error(`  - ${player.name} (${player.url}): ${String(error)}`);
      }
    }
    console.error("\nRefusing to write output because the data set is incomplete.");
    process.exitCode = 1;
    process.exit(1);
  }

  const output = aggregateQuestions(results, `${BASE_URL}/players/`);

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(`\nWrote ${OUTPUT_PATH}`);
  console.log(`Total matching players: ${output.totalPlayers}`);
  console.log(`Unique normalized questions: ${output.questions.length}`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exitCode = 1;
  process.exit(1);
});

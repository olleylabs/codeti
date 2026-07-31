import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { dedupeByPlayerId, parseDirectoryPage } from "../src/directoryParser.js";
import { parseFaqQuestions } from "../src/playerParser.js";
import { hasExactlyThreeAs } from "../src/nameFilter.js";

const fixturesDir = path.join(__dirname, "fixtures");
const directoryHtml = readFileSync(path.join(fixturesDir, "directory.html"), "utf8");
const playerHtml = readFileSync(path.join(fixturesDir, "player.html"), "utf8");

describe("parseDirectoryPage", () => {
  it("extracts name, url and playerId for every listed player", () => {
    const players = parseDirectoryPage(directoryHtml);
    expect(players).toContainEqual({
      name: "Henry Aaron",
      url: "https://www.baseball-reference.com/players/a/aaronha01.shtml",
      playerId: "aaronha01",
    });
    expect(players).toHaveLength(8);
  });

  it("derives a playerId that contains a dot, as real Baseball Reference URLs sometimes do", () => {
    const players = parseDirectoryPage(directoryHtml);
    expect(players).toContainEqual({
      name: "Sandy Baldwin",
      url: "https://www.baseball-reference.com/players/b/baldwo.01.shtml",
      playerId: "baldwo.01",
    });
  });

  it("filters down to only players with exactly three a's", () => {
    const players = parseDirectoryPage(directoryHtml);
    const matching = players.filter((p) => hasExactlyThreeAs(p.name));
    expect(matching.map((p) => p.name)).toEqual(["Fernando Abad"]);
  });
});

describe("dedupeByPlayerId", () => {
  it("removes duplicate entries by playerId", () => {
    const players = parseDirectoryPage(directoryHtml);
    const deduped = dedupeByPlayerId(players);
    const aaronEntries = deduped.filter((p) => p.playerId === "aaronha01");
    expect(aaronEntries).toHaveLength(1);
    expect(deduped).toHaveLength(7);
  });
});

describe("parseFaqQuestions", () => {
  it("extracts only questions from the FAQ section", () => {
    const questions = parseFaqQuestions(playerHtml);
    expect(questions).toEqual([
      "When was Henry Aaron born?",
      "How tall was Henry Aaron?",
      "What are Henry Aaron's nicknames?",
    ]);
  });

  it("does not pick up headings outside the FAQ section", () => {
    const questions = parseFaqQuestions(playerHtml);
    expect(questions).not.toContain("This heading must not be extracted");
  });
});

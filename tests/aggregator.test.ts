import { describe, expect, it } from "vitest";
import { aggregateQuestions } from "../src/aggregator.js";
import type { PlayerFaqResult } from "../src/types.js";

const GENERATED_AT = "2026-07-30T00:00:00.000Z";
const SOURCE = "https://www.baseball-reference.com/players/";

describe("aggregateQuestions", () => {
  it("counts a shared question once per player", () => {
    const results: PlayerFaqResult[] = [
      {
        player: { name: "David Aardsma", url: "u1", playerId: "aardsda01" },
        questions: ["When was David Aardsma born?"],
      },
      {
        player: { name: "Henry Aaron", url: "u2", playerId: "aaronha01" },
        questions: ["When was Henry Aaron born?"],
      },
    ];

    const output = aggregateQuestions(results, results.length, SOURCE, GENERATED_AT);
    expect(output.questions).toEqual([{ question: "when was <player> born?", playerCount: 2 }]);
  });

  it("counts a duplicate question on one player's page only once", () => {
    const results: PlayerFaqResult[] = [
      {
        player: { name: "Henry Aaron", url: "u2", playerId: "aaronha01" },
        questions: ["How tall is Henry Aaron?", "How tall is Henry Aaron?"],
      },
    ];

    const output = aggregateQuestions(results, results.length, SOURCE, GENERATED_AT);
    expect(output.questions).toEqual([{ question: "how tall is <player>?", playerCount: 1 }]);
  });

  it("includes players with no FAQ questions in totalPlayers but not in questions", () => {
    const results: PlayerFaqResult[] = [
      { player: { name: "Henry Aaron", url: "u2", playerId: "aaronha01" }, questions: [] },
    ];

    const output = aggregateQuestions(results, results.length, SOURCE, GENERATED_AT);
    expect(output.totalPlayers).toBe(1);
    expect(output.questions).toEqual([]);
  });

  it("sorts questions alphabetically for deterministic output", () => {
    const results: PlayerFaqResult[] = [
      {
        player: { name: "Henry Aaron", url: "u2", playerId: "aaronha01" },
        questions: ["Where was Henry Aaron born?", "How tall is Henry Aaron?"],
      },
    ];

    const output = aggregateQuestions(results, results.length, SOURCE, GENERATED_AT);
    expect(output.questions.map((q) => q.question)).toEqual([
      "how tall is <player>?",
      "where was <player> born?",
    ]);
  });

  it("marks the result complete when every matching player has FAQ data", () => {
    const results: PlayerFaqResult[] = [
      { player: { name: "Henry Aaron", url: "u2", playerId: "aaronha01" }, questions: [] },
    ];

    const output = aggregateQuestions(results, results.length, SOURCE, GENERATED_AT);
    expect(output.complete).toBe(true);
    expect(output.playersWithFaqData).toBe(1);
  });

  it("marks the result incomplete and keeps the true total when players are missing", () => {
    const results: PlayerFaqResult[] = [
      { player: { name: "Henry Aaron", url: "u2", playerId: "aaronha01" }, questions: [] },
    ];

    const output = aggregateQuestions(results, 5, SOURCE, GENERATED_AT);
    expect(output.complete).toBe(false);
    expect(output.totalPlayers).toBe(5);
    expect(output.playersWithFaqData).toBe(1);
  });
});

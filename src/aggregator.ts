import { normalizeQuestion } from "./questionNormalizer.js";
import type { AggregatorOutput, PlayerFaqResult, QuestionAggregate } from "./types.js";

export function aggregateQuestions(
  results: PlayerFaqResult[],
  totalMatchingPlayers: number,
  source: string,
  generatedAt: string = new Date().toISOString(),
): AggregatorOutput {
  const globalCounts = new Map<string, number>();

  for (const result of results) {
    const normalizedForPlayer = new Set(
      result.questions.map((question) => normalizeQuestion(question, result.player.name)),
    );
    for (const question of normalizedForPlayer) {
      globalCounts.set(question, (globalCounts.get(question) ?? 0) + 1);
    }
  }

  const questions: QuestionAggregate[] = [...globalCounts.entries()]
    .map(([question, playerCount]) => ({ question, playerCount }))
    .sort((a, b) => a.question.localeCompare(b.question));

  return {
    generatedAt,
    source,
    complete: results.length === totalMatchingPlayers,
    totalPlayers: totalMatchingPlayers,
    playersWithFaqData: results.length,
    questions,
  };
}

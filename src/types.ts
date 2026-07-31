export interface PlayerReference {
  name: string;
  url: string;
  playerId: string;
}

export interface PlayerFaqResult {
  player: PlayerReference;
  questions: string[];
}

export interface QuestionAggregate {
  question: string;
  playerCount: number;
}

export interface AggregatorOutput {
  generatedAt: string;
  source: string;
  complete: boolean;
  totalPlayers: number;
  playersWithFaqData: number;
  questions: QuestionAggregate[];
}

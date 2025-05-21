export interface Environment {
  id: number;
  name: string;
}

export interface Deck {
  id: number;
  name: string;
  author_id: string;
  environment_id: number;
}

export interface MatchType {
  id: number;
  name: string;
}

export interface MatchResult {
  id: number;
  environment_id: number;
  match_type_id: number;
  first_deck_id: number;
  second_deck_id: number;
  winning_deck_id: number;
  losing_deck_id: number;
}

export interface MatchupStats {
  total: number;
  wins: number;
  win_rate: number;
  first_hand_total?: number;
  first_hand_wins?: number;
  second_hand_total?: number;
  second_hand_wins?: number;
}

export interface DeckStatistics {
  deck_name: string;
  total_matches: number;
  wins: number;
  losses: number;
  win_rate: number;
}

export interface BatchMatch {
  first_player: "first" | "second";
  win: "first" | "second";
} 
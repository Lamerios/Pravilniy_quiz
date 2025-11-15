/**
 * Shared types between frontend and backend
 * Contains all data models and API interfaces
 */

// Team related types
export interface Team {
  id: number;
  name: string;
  logo_path: string | null;
  created_at: string;
  members_count?: number | null;
}

export interface CreateTeamRequest {
  name: string;
}

export interface UpdateTeamRequest {
  name?: string;
}

// Game template related types
export interface GameTemplate {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  rounds?: TemplateRound[];
}

export interface TemplateRound {
  id: number;
  template_id: number;
  round_number: number;
  name: string;
  max_score: number; // supports one decimal place
}

export interface CreateGameTemplateRequest {
  name: string;
  description?: string;
  rounds: CreateTemplateRoundRequest[];
}

export interface CreateTemplateRoundRequest {
  round_number: number;
  name: string;
  max_score: number; // supports one decimal place
}

// Game related types
export interface Game {
  id: number;
  name: string;
  template_id: number;
  status: GameStatus;
  current_round: number;
  created_at: string;
  event_date: string | null; // planned date/time in ISO or null
  template?: GameTemplate;
  participants?: GameParticipant[];
}

export interface GameParticipant {
  id: number;
  game_id: number;
  team_id: number;
  table_number: string | null;
  table_code?: string | null;
  participants_count?: number | null;
  team?: Team;
}

export interface CreateGameRequest {
  name: string;
  template_id: number;
  team_ids: number[];
  table_numbers?: (string | null)[];
  participants_counts?: (number | null)[];
  event_date?: string | null; // ISO datetime-local or null
}

export type GameStatus = 'created' | 'active' | 'finished';

// Score related types
export interface RoundScore {
  id: number;
  game_id: number;
  team_id: number;
  round_number: number;
  score: number; // supports one decimal place
  created_at: string;
  team?: Team;
}

export interface UpdateScoreRequest {
  team_id: number;
  round_number: number;
  score: number; // supports one decimal place
}

export interface ScoreboardData {
  game: Game;
  scores: RoundScore[];
  team_totals: TeamTotal[];
}

export interface TeamTotal {
  team_id: number;
  team: Team;
  total_score: number; // supports decimals
  round_scores: { [round: number]: number };
  table_number: string | null;
  table_code?: string | null;
}

// Global ranking types
export interface GlobalRank {
  title: string;
  minPoints: number;
  description: string;
  icon: string;
  colorTheme: string;
}

export interface TeamStatsRankBlock {
  totalPoints: number;
  globalRank: GlobalRank | null;
  nextRank?: GlobalRank | null;
  progressPercent: number; // 0..100
  ranks?: GlobalRank[]; // optional full ladder
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Socket.io event types
export interface SocketEvents {
  // Client to server events
  'join-game': (gameId: number) => void;
  'leave-game': (gameId: number) => void;
  
  // Server to client events
  'game-updated': (game: Game) => void;
  'scores-updated': (scores: RoundScore[]) => void;
  'round-changed': (gameId: number, roundNumber: number) => void;
  'game-status-changed': (gameId: number, status: GameStatus) => void;
}

// Error types
export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: ValidationError[];
}


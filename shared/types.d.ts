/**
 * Shared types between frontend and backend
 * Contains all data models and API interfaces
 */
export interface Team {
    id: number;
    name: string;
    logo_path: string | null;
    created_at: string;
}
export interface CreateTeamRequest {
    name: string;
}
export interface UpdateTeamRequest {
    name?: string;
}
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
    max_score: number;
}
export interface CreateGameTemplateRequest {
    name: string;
    description?: string;
    rounds: CreateTemplateRoundRequest[];
}
export interface CreateTemplateRoundRequest {
    round_number: number;
    name: string;
    max_score: number;
}
export interface Game {
    id: number;
    name: string;
    template_id: number;
    status: GameStatus;
    current_round: number;
    created_at: string;
    template?: GameTemplate;
    participants?: GameParticipant[];
}
export interface GameParticipant {
    id: number;
    game_id: number;
    team_id: number;
    table_number: number | null;
    team?: Team;
}
export interface CreateGameRequest {
    name: string;
    template_id: number;
    team_ids: number[];
    table_numbers?: number[];
}
export type GameStatus = 'created' | 'active' | 'finished';
export interface RoundScore {
    id: number;
    game_id: number;
    team_id: number;
    round_number: number;
    score: number;
    created_at: string;
    team?: Team;
}
export interface UpdateScoreRequest {
    team_id: number;
    round_number: number;
    score: number;
}
export interface ScoreboardData {
    game: Game;
    scores: RoundScore[];
    team_totals: TeamTotal[];
}
export interface TeamTotal {
    team_id: number;
    team: Team;
    total_score: number;
    round_scores: {
        [round: number]: number;
    };
    table_number: number | null;
}
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
export interface SocketEvents {
    'join-game': (gameId: number) => void;
    'leave-game': (gameId: number) => void;
    'game-updated': (game: Game) => void;
    'scores-updated': (scores: RoundScore[]) => void;
    'round-changed': (gameId: number, roundNumber: number) => void;
    'game-status-changed': (gameId: number, status: GameStatus) => void;
}
export interface ValidationError {
    field: string;
    message: string;
}
export interface ApiError {
    message: string;
    code?: string;
    details?: ValidationError[];
}
//# sourceMappingURL=types.d.ts.map
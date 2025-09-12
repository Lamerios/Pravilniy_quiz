/**
 * Game Service
 * Handles business logic for game creation, state management, and scoring.
 */

import { database } from '../db/database';
import { Game, CreateGameRequest, RoundScore } from '../../../shared/types';
import { ApiError } from '../utils/ApiError';

class GameService {
  /**
   * Create a new game
   * @param data - Game creation data
   * @returns The newly created game object
   */
  public async createGame(data: CreateGameRequest): Promise<Game> {
    const { name, template_id, team_ids, table_numbers, event_date, participants_counts } = data;

    // Basic validation
    if (!name || !template_id || !team_ids || team_ids.length === 0) {
      throw new ApiError('Missing required fields: name, template_id, and at least one team are required', 400);
    }
    
    // Check if template exists
    const template = await database.query('SELECT id FROM game_templates WHERE id = $1', [template_id]);
    if ((template.rowCount ?? 0) === 0) {
      throw new ApiError(`Game template with ID ${template_id} not found`, 404);
    }

    // Check if all teams exist
    const teamsResult = await database.query('SELECT id FROM teams WHERE id = ANY($1::int[])', [team_ids]);
    if ((teamsResult.rowCount ?? 0) !== team_ids.length) {
      const foundIds = teamsResult.rows.map(r => r.id);
      const notFound = team_ids.filter(id => !foundIds.includes(id));
      throw new ApiError(`Some teams not found: ${notFound.join(', ')}`, 404);
    }

    // Validate table labels uniqueness if provided (string labels)
    if (Array.isArray(table_numbers)) {
      const provided = table_numbers.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
                                    .map((v) => v.trim());
      const hasDuplicates = new Set(provided).size !== provided.length;
      if (hasDuplicates) {
        throw new ApiError('Table labels must be unique', 400);
      }
    }

    let game: Game;

    // Use a transaction to ensure atomicity
    const client = await database.getClient();
    try {
      await client.query('BEGIN');

      // Ensure new columns exist
      await client.query('ALTER TABLE games ADD COLUMN IF NOT EXISTS event_date TIMESTAMP NULL');
      await client.query('ALTER TABLE game_participants ADD COLUMN IF NOT EXISTS participants_count INTEGER');

      // 1. Create the game entry
      const gameResult = await client.query(
        'INSERT INTO games (name, template_id, event_date) VALUES ($1, $2, $3) RETURNING *',
        [name, template_id, event_date ? new Date(event_date) : null]
      );
      game = gameResult.rows[0];

      // 2. Create game participants
      const participantValues = team_ids.map((teamId, index) => {
        const tableLabel = Array.isArray(table_numbers) ? (table_numbers[index] ?? null) : null;
        const tableVal = tableLabel === null ? 'NULL' : `'${String(tableLabel).replace(/'/g, "''")}'`;
        const cnt = Array.isArray(participants_counts) ? (participants_counts[index] ?? null) : null;
        const cntVal = cnt === null || cnt === undefined ? 'NULL' : Number(cnt);
        return `(${game.id}, ${teamId}, ${tableVal}, ${cntVal})`;
      }).join(', ');
      
      const participantsResult = await client.query(
        `INSERT INTO game_participants (game_id, team_id, table_number, participants_count) VALUES ${participantValues} RETURNING *`
      );
      game.participants = participantsResult.rows;

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      throw new ApiError('Failed to create game due to a database error', 500, error);
    } finally {
      client.release();
    }
    
    return game;
  }

  /**
   * Update participants (table numbers) for a game
   */
  public async updateParticipants(
    gameId: number,
    updates: { team_id: number; table_number: string | null }[],
  ) {
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new ApiError('No participants provided', 400);
    }

    // Validate uniqueness (for non-empty strings)
    const provided = updates
      .map(u => u.table_number)
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .map(v => v.trim());
    const hasDuplicates = new Set(provided).size !== provided.length;
    if (hasDuplicates) {
      throw new ApiError('Table labels must be unique', 400);
    }

    const client = await database.getClient();
    try {
      await client.query('BEGIN');

      // Verify that all team_ids are participants of this game
      const teamIds = updates.map(u => u.team_id);
      const existing = await client.query(
        'SELECT team_id FROM game_participants WHERE game_id = $1 AND team_id = ANY($2::int[])',
        [gameId, teamIds]
      );
      if ((existing.rowCount ?? 0) !== teamIds.length) {
        const existingIds = new Set(existing.rows.map(r => r.team_id));
        const missing = teamIds.filter(id => !existingIds.has(id));
        throw new ApiError(`Teams are not participants of this game: ${missing.join(', ')}`, 400);
      }

      // Apply updates
      for (const u of updates) {
        const value = u.table_number === null || u.table_number === undefined || u.table_number === ''
          ? null
          : u.table_number.trim();
        await client.query(
          'UPDATE game_participants SET table_number = $1 WHERE game_id = $2 AND team_id = $3',
          [value, gameId, u.team_id]
        );
      }

      const result = await client.query(
        'SELECT * FROM game_participants WHERE game_id = $1 ORDER BY id',
        [gameId]
      );

      await client.query('COMMIT');
      return result.rows;
    } catch (error) {
      await client.query('ROLLBACK');
      throw new ApiError('Failed to update participants', 500, error);
    } finally {
      client.release();
    }
  }

  // Iteration 4: Status
  public async updateStatus(gameId: number, status: 'created'|'active'|'finished'): Promise<Game> {
    if (!['created','active','finished'].includes(status)) {
      throw new ApiError('Invalid game status', 400);
    }
    const result = await database.query('UPDATE games SET status = $1 WHERE id = $2 RETURNING *', [status, gameId]);
    if ((result.rowCount ?? 0) === 0) throw new ApiError('Game not found', 404);
    return result.rows[0];
  }

  // Iteration 4: Current round
  public async updateRound(gameId: number, current_round: number): Promise<Game> {
    if (!Number.isInteger(current_round) || current_round < 0) {
      throw new ApiError('current_round must be a non-negative integer', 400);
    }
    const result = await database.query('UPDATE games SET current_round = $1 WHERE id = $2 RETURNING *', [current_round, gameId]);
    if ((result.rowCount ?? 0) === 0) throw new ApiError('Game not found', 404);
    return result.rows[0];
  }

  // Iteration 4: Scores
  public async upsertScore(gameId: number, team_id: number, round_number: number, score: number): Promise<RoundScore> {
    if (!Number.isInteger(round_number) || round_number <= 0) {
      throw new ApiError('round_number must be positive integer', 400);
    }
    if (!Number.isFinite(score)) {
      throw new ApiError('score must be a number', 400);
    }
    // round to one decimal place
    score = Math.round(score * 10) / 10;
    // allow at most one decimal place
    const scoreTimes10 = score * 10;
    if (Math.abs(scoreTimes10 - Math.round(scoreTimes10)) > 1e-9) {
      throw new ApiError('score must have at most one decimal place', 400);
    }

    // ensure participant exists
    const part = await database.query('SELECT 1 FROM game_participants WHERE game_id = $1 AND team_id = $2', [gameId, team_id]);
    if ((part.rowCount ?? 0) === 0) throw new ApiError('Team is not a participant of the game', 400);

    // enforce template round max if defined (upper bound only)
    const maxRes = await database.query(
      `SELECT tr.max_score
         FROM games g
         JOIN game_templates gt ON gt.id = g.template_id
         LEFT JOIN template_rounds tr ON tr.template_id = gt.id AND tr.round_number = $2
        WHERE g.id = $1`,
      [gameId, round_number]
    );
    if ((maxRes.rowCount ?? 0) > 0) {
      const rawMax = maxRes.rows[0]?.max_score as unknown;
      const maxScore = rawMax === null || rawMax === undefined ? null : Number(rawMax);
      if (maxScore !== null && Number.isFinite(maxScore) && score - maxScore > 1e-9) {
        throw new ApiError(`Превышение максимума для раунда (${maxScore}). Исправьте значение и повторите.`, 400);
      }
    }

    const result = await database.query(
      `INSERT INTO round_scores (game_id, team_id, round_number, score)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (game_id, team_id, round_number)
       DO UPDATE SET score = EXCLUDED.score
       RETURNING *`,
      [gameId, team_id, round_number, score]
    );
    return result.rows[0];
  }

  public async getScores(gameId: number): Promise<RoundScore[]> {
    const result = await database.query(
      `SELECT rs.* FROM round_scores rs WHERE rs.game_id = $1 ORDER BY round_number, team_id`,
      [gameId]
    );
    return result.rows;
  }

  /**
   * Get all games with basic details
   * @returns A list of games
   */
  public async getGames(): Promise<Game[]> {
    const result = await database.query(
      `SELECT 
         g.*,
         gt.name as template_name,
         (SELECT COUNT(*)::int FROM game_participants gp WHERE gp.game_id = g.id) as participant_count
       FROM games g
       JOIN game_templates gt ON g.template_id = gt.id
       ORDER BY g.created_at DESC`
    );
    return result.rows;
  }

  /**
   * Get a single game by its ID with all details
   * @param id - The ID of the game
   * @returns The full game object or null if not found
   */
  public async getGameById(id: number): Promise<Game | null> {
    const gameResult = await database.query('SELECT * FROM games WHERE id = $1', [id]);
    if ((gameResult.rowCount ?? 0) === 0) {
      return null;
    }
    
    const game: Game = gameResult.rows[0];
    if (game.event_date) {
      // ensure ISO string for frontend
      (game as any).event_date = new Date(game.event_date as any).toISOString();
    }

    // Fetch template
    const templateResult = await database.query('SELECT * FROM game_templates WHERE id = $1', [game.template_id]);
    if ((templateResult.rowCount ?? 0) > 0) {
      game.template = templateResult.rows[0];
      // Load template rounds to render all rounds on the frontend
      const roundsResult = await database.query(
        'SELECT * FROM template_rounds WHERE template_id = $1 ORDER BY round_number ASC',
        [game.template_id]
      );
      if (game.template) {
        const rounds = roundsResult.rows.map((r: any) => ({
          ...r,
          max_score: r.max_score === null || r.max_score === undefined ? null : Number(r.max_score),
        }));
        (game.template as any).rounds = rounds;
      }
    }
    
    // Fetch participants with team details
    const participantsResult = await database.query(
      `SELECT gp.*, t.name as team_name, t.logo_path, t.created_at as team_created_at 
       FROM game_participants gp
       JOIN teams t ON gp.team_id = t.id
       WHERE gp.game_id = $1`,
      [id]
    );
    game.participants = participantsResult.rows.map(p => ({
      ...p,
      team: {
        id: p.team_id,
        name: p.team_name,
        logo_path: p.logo_path,
        created_at: p.team_created_at,
        members_count: (p as any).members_count ?? null,
      },
      participants_count: (p as any).participants_count ?? null,
    }));
    
    return game;
  }
}

export const gameService = new GameService();

/**
 * Stats and public data service
 * Aggregates last game and global statistics without modifying existing logic
 */

import { database } from '../db/database';
import { gameService } from './gameService';

export interface PublicLastGameResponse {
  game: any; // reuse existing gameService shape
  totalsByTeam: Record<number, number>;
}

export interface PublicStatsResponse {
  total_games: number;
  total_points: number;
  leaders_wins: Array<{ team_id: number; team_name: string; wins: number }>;
  leaders_avg: Array<{ team_id: number; team_name: string; avg_total: number; games: number }>;
  leaders_places: Array<{ team_id: number; team_name: string; first_places: number; second_places: number; third_places: number }>;
}

export interface TeamProfileResponse {
  team: any;
  games_played: number;
  total_points: number;
  avg_points: number;
  placements: { first: number; second: number; third: number };
  recent_games: Array<{ game_id: number; game_name: string; total: number; place: number; event_date: string | null }>;
}

export const statsService = {
  async getLastGame(): Promise<PublicLastGameResponse | null> {
    // Самая свежая игра по created_at
    const q = await database.query(
      'SELECT id FROM games ORDER BY created_at DESC LIMIT 1'
    );
    if (q.rowCount === 0) return null;
    const gameId = q.rows[0].id as number;
    const game = await gameService.getGameById(gameId);

    // Totals by team
    const totalsByTeam: Record<number, number> = {};
    const rs = await database.query(
      'SELECT team_id, SUM(score)::float AS total FROM round_scores WHERE game_id = $1 GROUP BY team_id',
      [gameId]
    );
    for (const r of rs.rows) {
      totalsByTeam[r.team_id] = Number(r.total) || 0;
    }
    return { game, totalsByTeam };
  },

  async getStats(): Promise<PublicStatsResponse> {
    const totalGamesQ = await database.query('SELECT COUNT(*)::int AS c FROM games');
    const totalScoresQ = await database.query('SELECT COALESCE(SUM(score),0)::float AS s FROM round_scores');

    // Получим все игры и посчитаем победителей/места/тоталы
    const gamesQ = await database.query('SELECT id, name, created_at FROM games ORDER BY created_at DESC');
    const leadersWins = new Map<number, { team_id: number; team_name: string; wins: number }>();
    const leadersPlaces = new Map<number, { team_id: number; team_name: string; first_places: number; second_places: number; third_places: number }>();
    const totalsByTeam: Map<number, { team_id: number; team_name: string; total: number; games: number }> = new Map();

    for (const g of gamesQ.rows) {
      const roundsQ = await database.query(
        'SELECT tr.round_number AS rn FROM template_rounds tr JOIN games gg ON gg.template_id = tr.template_id WHERE gg.id = $1 ORDER BY tr.round_number ASC',
        [g.id]
      );
      const roundNumbers: number[] = roundsQ.rows.map((r) => Number(r.rn));
      const scoresQ = await database.query(
        'SELECT team_id, round_number, score::float FROM round_scores WHERE game_id = $1',
        [g.id]
      );

      const teamIds = new Set<number>();
      const byTeamRound = new Map<string, number>();
      for (const r of scoresQ.rows) {
        teamIds.add(r.team_id);
        byTeamRound.set(`${r.team_id}:${r.round_number}`, Number(r.score) || 0);
      }

      // totals and ranking per game
      const rows: Array<{ team_id: number; team_name: string; total: number; key: number[] }> = [];
      for (const teamId of teamIds) {
        const tQ = await database.query('SELECT name FROM teams WHERE id = $1', [teamId]);
        const teamName = tQ.rows[0]?.name || `Команда #${teamId}`;
        let total = 0;
        const key: number[] = [];
        for (const rn of roundNumbers) {
          const val = byTeamRound.get(`${teamId}:${rn}`) || 0;
          total += val;
          key.push(val);
        }
        // сортировка: total, затем с конца key (последний раунд выше при равенстве)
        rows.push({ team_id: teamId, team_name: teamName, total, key });
      }
      rows.sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        for (let i = a.key.length - 1; i >= 0; i--) {
          const d = b.key[i] - a.key[i];
          if (Math.abs(d) > 1e-9) return d;
        }
        return 0;
      });

      rows.forEach((r, idx) => {
        // aggregate totals/avg per team
        const agg = totalsByTeam.get(r.team_id) || { team_id: r.team_id, team_name: r.team_name, total: 0, games: 0 };
        agg.total += r.total;
        agg.games += 1;
        totalsByTeam.set(r.team_id, agg);

        // places
        const places = leadersPlaces.get(r.team_id) || { team_id: r.team_id, team_name: r.team_name, first_places: 0, second_places: 0, third_places: 0 };
        if (idx === 0) places.first_places += 1;
        if (idx === 1) places.second_places += 1;
        if (idx === 2) places.third_places += 1;
        leadersPlaces.set(r.team_id, places);
      });

      if (rows[0]) {
        const w = rows[0];
        const lw = leadersWins.get(w.team_id) || { team_id: w.team_id, team_name: w.team_name, wins: 0 };
        lw.wins += 1;
        leadersWins.set(w.team_id, lw);
      }
    }

    const leaders_avg = Array.from(totalsByTeam.values())
      .filter((x) => x.games > 0)
      .map((x) => ({ team_id: x.team_id, team_name: x.team_name, avg_total: Number((x.total / x.games).toFixed(2)), games: x.games }))
      .sort((a, b) => b.avg_total - a.avg_total)
      .slice(0, 10);

    const leaders_wins = Array.from(leadersWins.values()).sort((a, b) => b.wins - a.wins).slice(0, 10);
    const leaders_places = Array.from(leadersPlaces.values()).sort((a, b) => b.first_places - a.first_places || b.second_places - a.second_places || b.third_places - a.third_places).slice(0, 10);

    return {
      total_games: Number(totalGamesQ.rows[0].c) || 0,
      total_points: Number(totalScoresQ.rows[0].s) || 0,
      leaders_wins,
      leaders_avg,
      leaders_places
    };
  },

  async getTeamProfile(teamId: number): Promise<TeamProfileResponse | null> {
    const tQ = await database.query('SELECT id, name, logo_path, created_at FROM teams WHERE id = $1', [teamId]);
    if (tQ.rowCount === 0) return null;
    const team = tQ.rows[0];

    // По играм: тоталы и места
    const gamesQ = await database.query('SELECT id, name, created_at, event_date FROM games ORDER BY created_at DESC');
    let gamesPlayed = 0;
    let totalPoints = 0;
    let first = 0, second = 0, third = 0;
    const recent: Array<{ game_id: number; game_name: string; total: number; place: number; event_date: string | null }> = [];

    for (const g of gamesQ.rows) {
      const roundsQ = await database.query(
        'SELECT tr.round_number AS rn FROM template_rounds tr JOIN games gg ON gg.template_id = tr.template_id WHERE gg.id = $1 ORDER BY tr.round_number ASC',
        [g.id]
      );
      const roundNumbers: number[] = roundsQ.rows.map((r) => Number(r.rn));
      const scoresQ = await database.query('SELECT team_id, round_number, score::float FROM round_scores WHERE game_id = $1', [g.id]);
      if (scoresQ.rowCount === 0) continue;
      const teamIds = new Set<number>();
      const byTeamRound = new Map<string, number>();
      for (const r of scoresQ.rows) {
        teamIds.add(r.team_id);
        byTeamRound.set(`${r.team_id}:${r.round_number}`, Number(r.score) || 0);
      }
      if (!teamIds.has(teamId)) continue;

      const rows: Array<{ team_id: number; total: number; key: number[] }> = [];
      for (const id of teamIds) {
        let total = 0;
        const key: number[] = [];
        for (const rn of roundNumbers) {
          const val = byTeamRound.get(`${id}:${rn}`) || 0;
          total += val;
          key.push(val);
        }
        rows.push({ team_id: id, total, key });
      }
      rows.sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        for (let i = a.key.length - 1; i >= 0; i--) {
          const d = b.key[i] - a.key[i];
          if (Math.abs(d) > 1e-9) return d;
        }
        return 0;
      });
      const place = rows.findIndex((r) => r.team_id === teamId) + 1;
      const me = rows.find((r) => r.team_id === teamId)!;
      gamesPlayed += 1;
      totalPoints += me.total;
      if (place === 1) first += 1; else if (place === 2) second += 1; else if (place === 3) third += 1;
      if (recent.length < 10) recent.push({ game_id: g.id, game_name: g.name, total: me.total, place, event_date: g.event_date || null });
    }

    const avg = gamesPlayed > 0 ? Number((totalPoints / gamesPlayed).toFixed(2)) : 0;
    return {
      team,
      games_played: gamesPlayed,
      total_points: totalPoints,
      avg_points: avg,
      placements: { first, second, third },
      recent_games: recent
    };
  }
};



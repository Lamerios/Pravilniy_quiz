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
  total_teams: number;
  total_points: number;
  leaders_wins: Array<{ team_id: number; team_name: string; wins: number }>;
  leaders_avg: Array<{ team_id: number; team_name: string; avg_total: number; games: number }>;
  leaders_places: Array<{ team_id: number; team_name: string; first_places: number; second_places: number; third_places: number }>;
  latest_games: Array<{ id: number; name: string; event_date: string | null }>; 
  global_ranking: Array<{ team_id: number; team_name: string; games: number; total_points: number; avg_points: number; avg_place: number; first_places: number; second_places: number; third_places: number }>;
}

export interface TeamProfileResponse {
  team: any;
  games_played: number;
  total_points: number;
  avg_points: number;
  placements: { first: number; second: number; third: number };
  recent_games: Array<{ game_id: number; game_name: string; total: number; place: number; event_date: string | null }>;
  round_stats?: Array<{ round_number: number; avg_score: number }>;
  h2h?: Array<{ opponent_id: number; opponent_name: string; games: number; wins: number; losses: number; draws: number }>;
  table_stats?: Array<{ table_number: string; games: number; avg_place: number }>;
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
    const totalTeamsQ = await database.query('SELECT COUNT(*)::int AS c FROM teams');
    const totalScoresQ = await database.query('SELECT COALESCE(SUM(score),0)::float AS s FROM round_scores');
    const latestGamesQ = await database.query('SELECT id, name, event_date FROM games ORDER BY created_at DESC LIMIT 10');

    // Получим все игры и посчитаем победителей/места/тоталы
    const gamesQ = await database.query('SELECT id, name, created_at FROM games ORDER BY created_at DESC');
    const leadersWins = new Map<number, { team_id: number; team_name: string; wins: number }>();
    const leadersPlaces = new Map<number, { team_id: number; team_name: string; first_places: number; second_places: number; third_places: number }>();
    const totalsByTeam: Map<number, { team_id: number; team_name: string; total: number; games: number }> = new Map();
    const placeSumByTeam: Map<number, { sum: number; games: number }> = new Map();

    // Head-to-Head и статистика по столам
    const h2h: Map<number, { opponent_id: number; opponent_name: string; games: number; wins: number; losses: number; draws: number }> = new Map();
    const tableAgg: Map<string, { sumPlace: number; games: number }> = new Map();

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
        // Debug: log total for specific teams
        if (teamId === 7 || teamId === 8) {
          console.log(`Game ${g.id}: Team ${teamId} total=${total}, rounds=${roundNumbers.length}, key=${key.join(',')}`);
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

        // accumulate place sums for average place
        const ps = placeSumByTeam.get(r.team_id) || { sum: 0, games: 0 };
        ps.sum += (idx + 1);
        ps.games += 1;
        placeSumByTeam.set(r.team_id, ps);
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

    // Debug: log totalsByTeam before mapping
    console.log('totalsByTeam size:', totalsByTeam.size);
    const firstTeam = Array.from(totalsByTeam.values())[0];
    if (firstTeam) {
      console.log('First team in totalsByTeam:', firstTeam);
    }
    
    const global_ranking = Array.from(totalsByTeam.values()).map((t) => {
      const ps = placeSumByTeam.get(t.team_id) || { sum: 0, games: 0 };
      const avg_place = ps.games > 0 ? Number((ps.sum / ps.games).toFixed(2)) : 0;
      const avg_points = t.games > 0 ? Number((t.total / t.games).toFixed(2)) : 0;
      const lp = leadersPlaces.get(t.team_id) || { first_places: 0, second_places: 0, third_places: 0, team_id: t.team_id, team_name: t.team_name };
      
      // Debug specific teams
      if (t.team_id === 7 || t.team_id === 8) {
        console.log(`Final for team ${t.team_id}: total=${t.total}, games=${t.games}, avg=${avg_points}`);
      }
      
      return {
        team_id: t.team_id,
        team_name: t.team_name,
        games: t.games,
        total_points: Number(t.total.toFixed(2)),
        avg_points,
        avg_place,
        first_places: lp.first_places,
        second_places: lp.second_places,
        third_places: lp.third_places
      };
    });

    return {
      total_games: Number(totalGamesQ.rows[0].c) || 0,
      total_teams: Number(totalTeamsQ.rows[0].c) || 0,
      total_points: Number(totalScoresQ.rows[0].s) || 0,
      leaders_wins,
      leaders_avg,
      leaders_places,
      latest_games: latestGamesQ.rows.map((g) => ({ id: g.id, name: g.name, event_date: g.event_date || null })),
      global_ranking
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

    // агрегаты по раундам
    const roundAgg = new Map<number, { sum: number; count: number }>();
    
    // Head-to-Head агрегация
    const h2h = new Map<number, { opponent_id: number; opponent_name: string; games: number; wins: number; losses: number; draws: number }>();
    
    // Статистика по столам
    const tableAgg = new Map<string, { sumPlace: number; games: number }>();

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

      // накапливаем по раундам значения этой команды
      for (let i = 0; i < roundNumbers.length; i++) {
        const rn = roundNumbers[i];
        const val = me.key[i] || 0;
        const agg = roundAgg.get(rn) || { sum: 0, count: 0 };
        agg.sum += val;
        agg.count += 1;
        roundAgg.set(rn, agg);
      }

      // Head-to-Head: подготовим места всех команд в этой игре
      const placesMap = new Map<number, number>();
      rows.forEach((r, idx) => placesMap.set(r.team_id, idx + 1));
      for (const r of rows) {
        if (r.team_id === teamId) continue;
        const oppId = r.team_id;
        const oppPlace = placesMap.get(oppId) || 0;
        const myPlace = place;
        const tQn = await database.query('SELECT name FROM teams WHERE id = $1', [oppId]);
        const oppName = tQn.rows[0]?.name || `Команда #${oppId}`;
        const rec = h2h.get(oppId) || { opponent_id: oppId, opponent_name: oppName, games: 0, wins: 0, losses: 0, draws: 0 };
        rec.games += 1;
        if (myPlace < oppPlace) rec.wins += 1; else if (myPlace > oppPlace) rec.losses += 1; else rec.draws += 1;
        h2h.set(oppId, rec);
      }

      // Таблицы: номер стола для нашей команды
      const tRow = await database.query('SELECT table_number FROM game_participants WHERE game_id = $1 AND team_id = $2 LIMIT 1', [g.id, teamId]);
      const tableNum = (tRow.rows[0]?.table_number as string | null) || '—';
      const tAgg = tableAgg.get(tableNum) || { sumPlace: 0, games: 0 };
      tAgg.sumPlace += place;
      tAgg.games += 1;
      tableAgg.set(tableNum, tAgg);
    }

    const avg = gamesPlayed > 0 ? Number((totalPoints / gamesPlayed).toFixed(2)) : 0;
    // формируем средние по раундам
    let round_stats = Array.from(roundAgg.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([round_number, v]) => ({ round_number, avg_score: v.count > 0 ? Number((v.sum / v.count).toFixed(2)) : 0 }));

    // Fallback: если по какой-то причине агрегация дала нули, считаем напрямую SQL'ом
    const hasPositive = round_stats.some((r) => r.avg_score > 0);
    if (!hasPositive) {
      const rq = await database.query(
        'SELECT round_number AS rn, AVG(score)::float AS avg FROM round_scores WHERE team_id = $1 GROUP BY round_number ORDER BY rn',
        [teamId]
      );
      round_stats = rq.rows.map((r) => ({ round_number: Number(r.rn), avg_score: Number(Number(r.avg).toFixed(2)) }));
    }

    // формируем Head-to-Head и статистику по столам
    const h2hArr: Array<{ opponent_id: number; opponent_name: string; games: number; wins: number; losses: number; draws: number }> = Array.from(h2h.values()).map((v) => ({ ...v })).sort((a, b) => (b.games || 0) - (a.games || 0)).slice(0, 10);
    const tableEntries: Array<[string, { sumPlace: number; games: number }]> = Array.from(tableAgg.entries());
    const table_stats: Array<{ table_number: string; games: number; avg_place: number }> = tableEntries
      .map(([table_number, v]) => ({ table_number: String(table_number), games: Number(v.games) || 0, avg_place: v.games > 0 ? Number((v.sumPlace / v.games).toFixed(2)) : 0 }))
      .sort((a: { table_number: string; games: number; avg_place: number }, b: { table_number: string; games: number; avg_place: number }) => (a.avg_place || 0) - (b.avg_place || 0));

    return {
      team,
      games_played: gamesPlayed,
      total_points: totalPoints,
      avg_points: avg,
      placements: { first, second, third },
      recent_games: recent,
      round_stats,
      h2h: h2hArr,
      table_stats
    };
  }
  ,
  /**
   * Server-side global ranking sorting + pagination (reuses aggregated data)
   */
  async getGlobalRanking(params: { sort?: string; order?: 'asc' | 'desc'; page?: number; limit?: number }) {
    const base = await this.getStats();
    const sort = (params.sort || 'total_points') as 'games' | 'avg_place' | 'total_points' | 'avg_points';
    const order = params.order || (sort === 'avg_place' ? 'asc' : 'desc');
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.max(1, Math.min(100, Number(params.limit || 10)));

    let arr = base.global_ranking.slice();
    arr.sort((a, b) => {
      const va = (a as any)[sort];
      const vb = (b as any)[sort];
      if (va !== vb) return (order === 'asc' ? 1 : -1) * (va > vb ? 1 : -1);
      // tiebreaks
      if (sort !== 'avg_place') {
        if (a.avg_points !== b.avg_points) return (order === 'asc' ? 1 : -1) * (a.avg_points > b.avg_points ? 1 : -1);
        if (a.games !== b.games) return (order === 'asc' ? 1 : -1) * (a.games > b.games ? 1 : -1);
      }
      return 0;
    });

    const total = arr.length;
    const start = (page - 1) * limit;
    const items = arr.slice(start, start + limit);
    return { items, page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)) };
  },

  async getTeamsPaginated(params: { page?: number; limit?: number }) {
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.max(1, Math.min(100, Number(params.limit || 10)));
    const offset = (page - 1) * limit;
    const totalQ = await database.query('SELECT COUNT(*)::int AS c FROM teams');
    const rowsQ = await database.query('SELECT id, name, logo_path, created_at FROM teams ORDER BY name ASC LIMIT $1 OFFSET $2', [limit, offset]);
    const total = Number(totalQ.rows[0].c) || 0;
    return { items: rowsQ.rows, page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)) };
  }
};



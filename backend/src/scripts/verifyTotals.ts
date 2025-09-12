import { database } from '../db/database';

async function run() {
  const games = await database.query('SELECT id, name, event_date FROM games ORDER BY created_at DESC LIMIT 5');
  for (const g of games.rows) {
    const rc = await database.query('SELECT COUNT(*)::int AS c FROM round_scores WHERE game_id=$1', [g.id]);
    const sums = await database.query('SELECT team_id, SUM(score)::float AS total FROM round_scores WHERE game_id=$1 GROUP BY team_id ORDER BY total DESC', [g.id]);
    console.log(`Game #${g.id} ${g.name} (${g.event_date || ''}) rows=${rc.rows[0].c}`);
    for (const r of sums.rows) {
      console.log(`  team ${r.team_id}: total=${r.total}`);
    }
  }
  process.exit(0);
}

run().catch((e)=>{ console.error(e); process.exit(1); });




import { database } from '../db/database';

/**
 * Cleanup imported games by template name or id.
 * Usage:
 *  ts-node src/scripts/cleanupImported.ts --template-name "Импорт (7 раундов)"
 *  ts-node src/scripts/cleanupImported.ts --template-id 5
 */
async function resolveTemplateId(args: string[]): Promise<number> {
  const idIdx = args.findIndex((a) => a === '--template-id');
  if (idIdx !== -1 && args[idIdx + 1]) {
    const tplId = Number(args[idIdx + 1]);
    if (!Number.isFinite(tplId) || tplId <= 0) throw new Error('Invalid --template-id value');
    const q = await database.query('SELECT id FROM game_templates WHERE id = $1', [tplId]);
    if ((q.rowCount ?? 0) === 0) throw new Error(`Template with id=${tplId} not found`);
    return tplId;
  }

  const nameIdx = args.findIndex((a) => a === '--template-name');
  if (nameIdx !== -1 && args[nameIdx + 1]) {
    const tplName = String(args[nameIdx + 1]).trim();
    const q = await database.query('SELECT id FROM game_templates WHERE name = $1', [tplName]);
    if ((q.rowCount ?? 0) === 0) throw new Error(`Template with name "${tplName}" not found`);
    return q.rows[0].id as number;
  }

  throw new Error('Provide --template-id or --template-name');
}

async function run() {
  const args = process.argv.slice(2);
  const templateId = await resolveTemplateId(args);

  // Delete games using this template (CASCADE: round_scores, game_participants via ON DELETE CASCADE on games)
  await database.query('BEGIN');
  try {
    const gamesQ = await database.query('SELECT id FROM games WHERE template_id = $1', [templateId]);
    const gameIds = gamesQ.rows.map((r) => r.id as number);

    // Explicit deletes to be safe even if cascade is not set everywhere
    await database.query('DELETE FROM round_scores WHERE game_id = ANY($1::int[])', [gameIds]);
    await database.query('DELETE FROM game_participants WHERE game_id = ANY($1::int[])', [gameIds]);
    const delGames = await database.query('DELETE FROM games WHERE template_id = $1 RETURNING id', [templateId]);

    await database.query('COMMIT');
    console.log(`Deleted ${delGames.rowCount || 0} games for template_id=${templateId}`);
  } catch (e) {
    await database.query('ROLLBACK');
    console.error(e);
    process.exit(1);
  }
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });



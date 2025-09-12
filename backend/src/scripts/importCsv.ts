/**
 * CSV Importer for statistics.csv
 * Usage: ts-node src/scripts/importCsv.ts --file ../../statistics.csv
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { database } from '../db/database';

interface Row {
  date: string;
  team: string;
  count: string;
  table: string;
  rounds: number[];
  totalCsv: string;
  placeCsv: string;
  source: string;
}

function parseNumber(value: string): number {
  if (!value || value.trim() === '') return 0;
  // normalize comma decimals like "1,2" -> 1.2 only when it's decimal
  const v = value.replace(',', '.');
  const num = Number(v);
  return isNaN(num) ? 0 : Number(num.toFixed(1));
}

function normalizeTeamName(name: string): string {
  return (name || '').trim();
}

function isPlaceholder(row: Row): boolean {
  const name = row.team.toLowerCase();
  const placeholderNames = ['свободный стол', 'бронь', 'стол 2 бронь', 'стол 2 бронь', 'стол 2 бронь'];
  if (placeholderNames.includes(name)) return true;
  const allZero = row.rounds.every((x) => Math.abs(x) < 1e-9);
  return allZero;
}

async function ensureImportTemplate(): Promise<number> {
  // create or fetch template "Импорт (7 раундов)"
  const t = await database.query('SELECT id FROM game_templates WHERE name = $1', ['Импорт (7 раундов)']);
  if (t.rowCount > 0) return t.rows[0].id;
  const ins = await database.query('INSERT INTO game_templates(name, description) VALUES ($1, $2) RETURNING id', ['Импорт (7 раундов)', 'Импорт CSV']);
  const templateId = ins.rows[0].id as number;
  // create 7 rounds without max limit
  for (let i = 1; i <= 7; i++) {
    await database.query('INSERT INTO template_rounds(template_id, round_number, name, max_score) VALUES ($1, $2, $3, $4)', [templateId, i, `Раунд ${i}`, null]);
  }
  return templateId;
}

async function upsertTeam(name: string): Promise<number> {
  const trimmed = normalizeTeamName(name);
  // case-insensitive only by case difference
  const q = await database.query('SELECT id, name FROM teams WHERE LOWER(name) = LOWER($1)', [trimmed]);
  if (q.rowCount > 0) return q.rows[0].id;
  const ins = await database.query('INSERT INTO teams(name) VALUES ($1) RETURNING id', [trimmed]);
  return ins.rows[0].id as number;
}

function parseDateToISO(dateStr: string): string {
  // M/D/YYYY -> YYYY-MM-DDT20:00:00+03:00 (store as UTC without TZ in DB; server will accept as ISO string)
  const [m, d, y] = dateStr.split('/').map((s) => Number(s));
  const dt = new Date(Date.UTC(y, (m - 1), d, 17, 0, 0)); // 20:00 MSK = 17:00 UTC
  return dt.toISOString();
}

async function upsertGame(source: string, dateIso: string, templateId: number): Promise<number> {
  const q = await database.query('SELECT id FROM games WHERE name = $1 AND DATE(event_date) = DATE($2)', [source, dateIso]);
  if (q.rowCount > 0) return q.rows[0].id as number;
  const ins = await database.query('INSERT INTO games(name, template_id, event_date) VALUES ($1, $2, $3) RETURNING id', [source, templateId, dateIso]);
  return ins.rows[0].id as number;
}

async function upsertParticipant(gameId: number, teamId: number, tableNumber: string | null, count: number | null): Promise<number> {
  const q = await database.query('SELECT id FROM game_participants WHERE game_id = $1 AND team_id = $2', [gameId, teamId]);
  if (q.rowCount > 0) {
    const id = q.rows[0].id as number;
    await database.query('UPDATE game_participants SET table_number=$1, participants_count=$2 WHERE id=$3', [tableNumber, count, id]);
    return id;
  }
  const ins = await database.query('INSERT INTO game_participants(game_id, team_id, table_number, participants_count) VALUES ($1, $2, $3, $4) RETURNING id', [gameId, teamId, tableNumber, count]);
  return ins.rows[0].id as number;
}

async function upsertScores(gameId: number, teamId: number, rounds: number[]): Promise<void> {
  for (let i = 0; i < rounds.length; i++) {
    const rn = i + 1;
    const score = rounds[i];
    // delete existing then insert to ensure "last wins"
    await database.query('DELETE FROM round_scores WHERE game_id=$1 AND team_id=$2 AND round_number=$3', [gameId, teamId, rn]);
    await database.query('INSERT INTO round_scores(game_id, team_id, round_number, score) VALUES ($1, $2, $3, $4)', [gameId, teamId, rn, score]);
  }
}

async function run() {
  const args = process.argv.slice(2);
  const fileArgIndex = args.findIndex((a) => a === '--file');
  if (fileArgIndex === -1 || !args[fileArgIndex + 1]) {
    console.error('Usage: ts-node src/scripts/importCsv.ts --file path/to/statistics.csv');
    process.exit(1);
  }
  const filePath = path.resolve(process.cwd(), args[fileArgIndex + 1]);
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(1);
  }

  const templateId = await ensureImportTemplate();
  const reportLines: string[] = ['date,source,team,reason,details'];

  const stream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let lineNo = 0;
  let headers: string[] = [];

  const groups = new Map<string, Row[]>();

  for await (const line of rl) {
    lineNo++;
    if (lineNo === 1) { headers = line.split(','); continue; }
    if (!line.trim()) continue;

    // naive CSV split, but handles quotes around table numbers like "1,2"
    const cols: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { cols.push(cur); cur = ''; continue; }
      cur += ch;
    }
    cols.push(cur);
    if (cols.length < 14) {
      reportLines.push(`,, ,PARSE_ERROR,cols=${cols.length}`);
      continue;
    }
    const row: Row = {
      date: cols[0].trim(),
      team: cols[1].trim(),
      count: cols[2].trim(),
      table: cols[3].trim(),
      rounds: [cols[4], cols[5], cols[6], cols[7], cols[8], cols[9], cols[10]].map((v) => parseNumber(v)),
      totalCsv: cols[11].trim(),
      placeCsv: cols[12].trim(),
      source: cols[13].trim()
    };

    if (isPlaceholder(row)) { reportLines.push(`${row.date},${row.source},${row.team},SKIP_PLACEHOLDER,`); continue; }

    const key = `${row.source}__${row.date}`;
    const arr = groups.get(key) || [];
    arr.push(row);
    groups.set(key, arr);
  }

  for (const [key, rows] of groups.entries()) {
    const [source, dateStr] = key.split('__');
    const dateIso = parseDateToISO(dateStr);
    await database.query('BEGIN');
    try {
      const gameId = await upsertGame(source, dateIso, templateId);
      // Map last occurrence per team
      const lastByTeam = new Map<string, Row>();
      for (const r of rows) lastByTeam.set(normalizeTeamName(r.team), r);

      for (const r of lastByTeam.values()) {
        const teamId = await upsertTeam(r.team);
        let count = parseInt(r.count, 10);
        if (!Number.isFinite(count)) count = 2;
        if (count <= 0) count = 2;
        const table = r.table || null;
        await upsertParticipant(gameId, teamId, table, count);
        await upsertScores(gameId, teamId, r.rounds);
      }

      await database.query('COMMIT');
    } catch (e: any) {
      await database.query('ROLLBACK');
      reportLines.push(`${dateStr},${source},,ERROR,${(e && e.message) || 'unknown'}`);
    }
  }

  const reportsDir = path.resolve(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  const fileName = `import-${new Date().toISOString().slice(0,10)}.csv`;
  fs.writeFileSync(path.join(reportsDir, fileName), reportLines.join('\n'), 'utf8');
  console.log('Import completed. Report:', path.join('reports', fileName));
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });



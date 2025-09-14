/**
 * Скрипт для выборочного экспорта данных квиз-игры
 * Позволяет экспортировать только определенные данные (например, только команды или только шаблоны)
 */

import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface ExportOptions {
  teams?: boolean;
  templates?: boolean;
  games?: boolean;
  activeGamesOnly?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

class SelectiveExporter {
  private pool: Pool;
  private exportDir: string;

  constructor() {
    const config = {
      host: process.env.DB_HOST!,
      port: parseInt(process.env.DB_PORT!),
      database: process.env.DB_NAME!,
      user: process.env.DB_USER!,
      password: process.env.DB_PASSWORD!
    };

    this.pool = new Pool(config);
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    this.exportDir = path.join(process.cwd(), '..', '..', 'exports', `selective-export-${timestamp}`);
  }

  /**
   * Выборочный экспорт данных
   */
  async export(options: ExportOptions): Promise<void> {
    try {
      console.log('🚀 Начинаем выборочный экспорт...');
      console.log('📋 Параметры экспорта:', options);
      
      await fs.mkdir(this.exportDir, { recursive: true });
      
      let exportSQL = `-- Выборочный экспорт данных квиз-игры
-- Дата экспорта: ${new Date().toISOString()}
-- Параметры: ${JSON.stringify(options, null, 2)}

SET session_replication_role = replica;

`;

      if (options.teams) {
        exportSQL += await this.exportTeams();
      }

      if (options.templates) {
        exportSQL += await this.exportTemplates();
      }

      if (options.games) {
        exportSQL += await this.exportGames(options);
      }

      exportSQL += `\nSET session_replication_role = DEFAULT;\n`;

      await fs.writeFile(path.join(this.exportDir, 'selective_export.sql'), exportSQL);
      
      // Создаем README с описанием экспорта
      await this.createReadme(options);
      
      console.log('✅ Выборочный экспорт завершен!');
      console.log(`📦 Файлы находятся в: ${this.exportDir}`);
      
    } catch (error) {
      console.error('❌ Ошибка при экспорте:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  /**
   * Экспорт команд
   */
  private async exportTeams(): Promise<string> {
    console.log('👥 Экспортируем команды...');
    
    const result = await this.pool.query('SELECT * FROM teams ORDER BY id');
    let sql = '\n-- Экспорт команд\nDELETE FROM teams;\n';
    
    for (const row of result.rows) {
      const values = [
        row.id,
        `'${row.name.replace(/'/g, "''")}'`,
        row.logo_path ? `'${row.logo_path}'` : 'NULL',
        `'${row.created_at.toISOString()}'`
      ];
      
      sql += `INSERT INTO teams (id, name, logo_path, created_at) VALUES (${values.join(', ')});\n`;
    }
    
    sql += `SELECT setval('teams_id_seq', (SELECT MAX(id) FROM teams));\n`;
    
    console.log(`✅ Экспортировано команд: ${result.rows.length}`);
    return sql;
  }

  /**
   * Экспорт шаблонов игр
   */
  private async exportTemplates(): Promise<string> {
    console.log('📋 Экспортируем шаблоны игр...');
    
    // Экспортируем шаблоны
    const templatesResult = await this.pool.query('SELECT * FROM game_templates ORDER BY id');
    let sql = '\n-- Экспорт шаблонов игр\nDELETE FROM template_rounds;\nDELETE FROM game_templates;\n';
    
    for (const row of templatesResult.rows) {
      const values = [
        row.id,
        `'${row.name.replace(/'/g, "''")}'`,
        row.description ? `'${row.description.replace(/'/g, "''")}'` : 'NULL',
        `'${row.created_at.toISOString()}'`
      ];
      
      sql += `INSERT INTO game_templates (id, name, description, created_at) VALUES (${values.join(', ')});\n`;
    }
    
    sql += `SELECT setval('game_templates_id_seq', (SELECT MAX(id) FROM game_templates));\n`;
    
    // Экспортируем раунды шаблонов
    const roundsResult = await this.pool.query('SELECT * FROM template_rounds ORDER BY template_id, round_number');
    
    for (const row of roundsResult.rows) {
      const values = [
        row.id,
        row.template_id,
        row.round_number,
        `'${row.name.replace(/'/g, "''")}'`,
        row.max_score
      ];
      
      sql += `INSERT INTO template_rounds (id, template_id, round_number, name, max_score) VALUES (${values.join(', ')});\n`;
    }
    
    sql += `SELECT setval('template_rounds_id_seq', (SELECT MAX(id) FROM template_rounds));\n`;
    
    console.log(`✅ Экспортировано шаблонов: ${templatesResult.rows.length}`);
    console.log(`✅ Экспортировано раундов: ${roundsResult.rows.length}`);
    return sql;
  }

  /**
   * Экспорт игр
   */
  private async exportGames(options: ExportOptions): Promise<string> {
    console.log('🎮 Экспортируем игры...');
    
    let whereClause = '';
    const conditions = [];
    
    if (options.activeGamesOnly) {
      conditions.push("status IN ('active', 'finished')");
    }
    
    if (options.dateFrom) {
      conditions.push(`created_at >= '${options.dateFrom}'`);
    }
    
    if (options.dateTo) {
      conditions.push(`created_at <= '${options.dateTo}'`);
    }
    
    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }
    
    // Экспортируем игры
    const gamesResult = await this.pool.query(`SELECT * FROM games ${whereClause} ORDER BY id`);
    let sql = '\n-- Экспорт игр\nDELETE FROM round_scores;\nDELETE FROM game_participants;\nDELETE FROM games;\n';
    
    const gameIds: number[] = [];
    
    for (const row of gamesResult.rows) {
      gameIds.push(row.id);
      
      const values = [
        row.id,
        `'${row.name.replace(/'/g, "''")}'`,
        row.template_id || 'NULL',
        `'${row.status}'`,
        row.current_round,
        row.event_date ? `'${row.event_date.toISOString()}'` : 'NULL',
        `'${row.created_at.toISOString()}'`
      ];
      
      sql += `INSERT INTO games (id, name, template_id, status, current_round, event_date, created_at) VALUES (${values.join(', ')});\n`;
    }
    
    if (gameIds.length > 0) {
      sql += `SELECT setval('games_id_seq', (SELECT MAX(id) FROM games));\n`;
      
      // Экспортируем участников игр
      const participantsResult = await this.pool.query(
        'SELECT * FROM game_participants WHERE game_id = ANY($1) ORDER BY game_id, id',
        [gameIds]
      );
      
      for (const row of participantsResult.rows) {
        const values = [
          row.id,
          row.game_id,
          row.team_id,
          row.table_number ? `'${row.table_number}'` : 'NULL',
          row.table_code ? `'${row.table_code}'` : 'NULL',
          row.participants_count || 'NULL'
        ];
        
        sql += `INSERT INTO game_participants (id, game_id, team_id, table_number, table_code, participants_count) VALUES (${values.join(', ')});\n`;
      }
      
      sql += `SELECT setval('game_participants_id_seq', (SELECT MAX(id) FROM game_participants));\n`;
      
      // Экспортируем результаты раундов
      const scoresResult = await this.pool.query(
        'SELECT * FROM round_scores WHERE game_id = ANY($1) ORDER BY game_id, round_number, team_id',
        [gameIds]
      );
      
      for (const row of scoresResult.rows) {
        const values = [
          row.id,
          row.game_id,
          row.team_id,
          row.round_number,
          row.score,
          `'${row.created_at.toISOString()}'`
        ];
        
        sql += `INSERT INTO round_scores (id, game_id, team_id, round_number, score, created_at) VALUES (${values.join(', ')});\n`;
      }
      
      sql += `SELECT setval('round_scores_id_seq', (SELECT MAX(id) FROM round_scores));\n`;
      
      console.log(`✅ Экспортировано игр: ${gamesResult.rows.length}`);
      console.log(`✅ Экспортировано участников: ${participantsResult.rows.length}`);
      console.log(`✅ Экспортировано результатов: ${scoresResult.rows.length}`);
    } else {
      console.log('ℹ️  Игры для экспорта не найдены');
    }
    
    return sql;
  }

  /**
   * Создание README файла
   */
  private async createReadme(options: ExportOptions): Promise<void> {
    const readme = `# Выборочный экспорт данных квиз-игры

Дата создания: ${new Date().toISOString()}

## Параметры экспорта

${JSON.stringify(options, null, 2)}

## Содержимое экспорта

- **selective_export.sql** - SQL скрипт с данными для импорта

## Как импортировать

### PostgreSQL
\`\`\`bash
psql -h localhost -U quiz_user -d quiz_game_new -f selective_export.sql
\`\`\`

### Через pgAdmin
1. Откройте pgAdmin
2. Подключитесь к целевой базе данных
3. Откройте Query Tool
4. Загрузите файл selective_export.sql
5. Выполните скрипт

## Важные замечания

- Скрипт удаляет существующие данные в соответствующих таблицах
- Убедитесь, что структура базы данных уже создана
- При импорте игр также импортируются связанные участники и результаты
- Последовательности (sequences) автоматически обновляются

## Структура данных

${options.teams ? '✅ Команды (teams)' : '❌ Команды не включены'}
${options.templates ? '✅ Шаблоны игр (game_templates, template_rounds)' : '❌ Шаблоны не включены'}
${options.games ? '✅ Игры (games, game_participants, round_scores)' : '❌ Игры не включены'}

${options.activeGamesOnly ? 'ℹ️  Экспортированы только активные/завершенные игры' : ''}
${options.dateFrom ? `ℹ️  Дата от: ${options.dateFrom}` : ''}
${options.dateTo ? `ℹ️  Дата до: ${options.dateTo}` : ''}
`;

    await fs.writeFile(path.join(this.exportDir, 'README.md'), readme);
  }
}

// Примеры использования
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Использование: npm run selective-export [опции]

Опции:
  --teams              Экспортировать команды
  --templates          Экспортировать шаблоны игр
  --games              Экспортировать игры
  --active-only        Только активные/завершенные игры
  --date-from YYYY-MM-DD  Игры от даты
  --date-to YYYY-MM-DD    Игры до даты

Примеры:
  npm run selective-export -- --teams --templates
  npm run selective-export -- --games --active-only
  npm run selective-export -- --games --date-from 2025-01-01
`);
    return;
  }
  
  const options: ExportOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--teams':
        options.teams = true;
        break;
      case '--templates':
        options.templates = true;
        break;
      case '--games':
        options.games = true;
        break;
      case '--active-only':
        options.activeGamesOnly = true;
        break;
      case '--date-from':
        options.dateFrom = args[++i];
        break;
      case '--date-to':
        options.dateTo = args[++i];
        break;
    }
  }
  
  try {
    const exporter = new SelectiveExporter();
    await exporter.export(options);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { SelectiveExporter };

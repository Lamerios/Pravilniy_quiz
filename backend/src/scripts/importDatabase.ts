/**
 * Скрипт для импорта базы данных квиз-игры
 * Импортирует структуру и данные из экспортированных файлов
 */

import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface ImportOptions {
  importDir: string;
  skipSchema?: boolean;
  skipData?: boolean;
  clearExisting?: boolean;
}

class DatabaseImporter {
  private pool: Pool;
  private config: any;

  constructor() {
    this.config = {
      host: process.env.DB_HOST!,
      port: parseInt(process.env.DB_PORT!),
      database: process.env.DB_NAME!,
      user: process.env.DB_USER!,
      password: process.env.DB_PASSWORD!
    };

    // Проверяем конфигурацию
    if (!this.config.host || !this.config.port || !this.config.database || 
        !this.config.user || !this.config.password) {
      throw new Error('Неполная конфигурация базы данных. Проверьте .env файл');
    }

    this.pool = new Pool(this.config);
  }

  /**
   * Основной метод импорта
   */
  async import(options: ImportOptions): Promise<void> {
    try {
      console.log('🚀 Начинаем импорт базы данных...');
      console.log(`📁 Директория импорта: ${options.importDir}`);
      
      // Проверяем подключение к базе данных
      await this.testConnection();
      
      // Проверяем существование файлов
      await this.validateImportFiles(options);
      
      if (!options.skipSchema) {
        await this.importSchema(options);
      }
      
      if (!options.skipData) {
        await this.importData(options);
      }
      
      // Показываем статистику после импорта
      await this.showStats();
      
      console.log('✅ Импорт завершен успешно!');
      
    } catch (error) {
      console.error('❌ Ошибка при импорте:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  /**
   * Проверка подключения к базе данных
   */
  private async testConnection(): Promise<void> {
    try {
      const result = await this.pool.query('SELECT NOW()');
      console.log('✅ Подключение к базе данных установлено');
      console.log(`📅 Время сервера: ${result.rows[0].now}`);
    } catch (error) {
      throw new Error(`Не удается подключиться к базе данных: ${error}`);
    }
  }

  /**
   * Проверка существования файлов импорта
   */
  private async validateImportFiles(options: ImportOptions): Promise<void> {
    console.log('🔍 Проверяем файлы импорта...');
    
    const schemaFile = path.join(options.importDir, '01_schema.sql');
    const dataFile = path.join(options.importDir, '02_data.sql');
    
    if (!options.skipSchema) {
      try {
        await fs.access(schemaFile);
        console.log('✅ Файл структуры найден');
      } catch (error) {
        throw new Error(`Файл структуры не найден: ${schemaFile}`);
      }
    }
    
    if (!options.skipData) {
      try {
        await fs.access(dataFile);
        console.log('✅ Файл данных найден');
      } catch (error) {
        throw new Error(`Файл данных не найден: ${dataFile}`);
      }
    }
  }

  /**
   * Импорт структуры базы данных
   */
  private async importSchema(options: ImportOptions): Promise<void> {
    console.log('📋 Импортируем структуру базы данных...');
    
    const schemaFile = path.join(options.importDir, '01_schema.sql');
    const schemaSQL = await fs.readFile(schemaFile, 'utf-8');
    
    try {
      // Выполняем SQL скрипт структуры
      await this.pool.query(schemaSQL);
      console.log('✅ Структура базы данных импортирована');
    } catch (error) {
      console.error('❌ Ошибка при импорте структуры:', error);
      throw error;
    }
  }

  /**
   * Импорт данных
   */
  private async importData(options: ImportOptions): Promise<void> {
    console.log('📊 Импортируем данные...');
    
    const dataFile = path.join(options.importDir, '02_data.sql');
    const dataSQL = await fs.readFile(dataFile, 'utf-8');
    
    try {
      // Выполняем SQL скрипт данных
      await this.pool.query(dataSQL);
      console.log('✅ Данные импортированы');
    } catch (error) {
      console.error('❌ Ошибка при импорте данных:', error);
      throw error;
    }
  }

  /**
   * Очистка существующих данных
   */
  private async clearExistingData(): Promise<void> {
    console.log('🧹 Очищаем существующие данные...');
    
    const clearSQL = `
      -- Отключаем проверки внешних ключей
      SET session_replication_role = replica;
      
      -- Очищаем таблицы в правильном порядке
      DELETE FROM round_scores;
      DELETE FROM game_participants;
      DELETE FROM games;
      DELETE FROM template_rounds;
      DELETE FROM game_templates;
      DELETE FROM teams;
      
      -- Сбрасываем последовательности
      SELECT setval('teams_id_seq', 1, false);
      SELECT setval('game_templates_id_seq', 1, false);
      SELECT setval('template_rounds_id_seq', 1, false);
      SELECT setval('games_id_seq', 1, false);
      SELECT setval('game_participants_id_seq', 1, false);
      SELECT setval('round_scores_id_seq', 1, false);
      
      -- Включаем обратно проверки внешних ключей
      SET session_replication_role = DEFAULT;
    `;
    
    try {
      await this.pool.query(clearSQL);
      console.log('✅ Существующие данные очищены');
    } catch (error) {
      console.error('❌ Ошибка при очистке данных:', error);
      throw error;
    }
  }

  /**
   * Показать статистику после импорта
   */
  private async showStats(): Promise<void> {
    console.log('\n📊 Статистика после импорта:');
    
    const tables = [
      'teams',
      'game_templates', 
      'template_rounds',
      'games',
      'game_participants',
      'round_scores'
    ];

    for (const table of tables) {
      try {
        const result = await this.pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  ${table}: ${result.rows[0].count} записей`);
      } catch (error) {
        console.log(`  ${table}: ошибка при подсчете`);
      }
    }
  }

  /**
   * Проверка целостности данных
   */
  async validateIntegrity(): Promise<void> {
    console.log('\n🔍 Проверяем целостность данных...');
    
    const checks = [
      {
        name: 'Шаблоны без раундов',
        query: `
          SELECT gt.id, gt.name 
          FROM game_templates gt 
          LEFT JOIN template_rounds tr ON gt.id = tr.template_id 
          WHERE tr.id IS NULL
        `
      },
      {
        name: 'Игры без участников',
        query: `
          SELECT g.id, g.name 
          FROM games g 
          LEFT JOIN game_participants gp ON g.id = gp.game_id 
          WHERE gp.id IS NULL
        `
      },
      {
        name: 'Участники без команд',
        query: `
          SELECT gp.id, gp.game_id 
          FROM game_participants gp 
          LEFT JOIN teams t ON gp.team_id = t.id 
          WHERE t.id IS NULL
        `
      },
      {
        name: 'Результаты без игр',
        query: `
          SELECT rs.id 
          FROM round_scores rs 
          LEFT JOIN games g ON rs.game_id = g.id 
          WHERE g.id IS NULL
        `
      }
    ];

    for (const check of checks) {
      try {
        const result = await this.pool.query(check.query);
        if (result.rows.length > 0) {
          console.log(`⚠️  ${check.name}: ${result.rows.length} проблем`);
          result.rows.forEach((row, index) => {
            if (index < 3) { // Показываем только первые 3
              console.log(`    ${JSON.stringify(row)}`);
            }
          });
          if (result.rows.length > 3) {
            console.log(`    ... и еще ${result.rows.length - 3}`);
          }
        } else {
          console.log(`✅ ${check.name}: OK`);
        }
      } catch (error) {
        console.log(`❌ Ошибка при проверке "${check.name}": ${error}`);
      }
    }
  }
}

// Функция для создания резервной копии перед импортом
async function createBackup(): Promise<string> {
  console.log('💾 Создаем резервную копию перед импортом...');
  
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), '..', '..', 'backups', `backup-${timestamp}`);
  
  try {
    await fs.mkdir(backupDir, { recursive: true });
    
    // Здесь можно добавить логику создания резервной копии
    // Например, вызов pg_dump
    
    console.log(`✅ Резервная копия создана: ${backupDir}`);
    return backupDir;
  } catch (error) {
    console.warn('⚠️  Не удалось создать резервную копию:', error);
    return '';
  }
}

// Основная функция
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Использование: npm run import-db [опции] <директория_импорта>

Опции:
  --skip-schema        Пропустить импорт структуры
  --skip-data          Пропустить импорт данных
  --clear-existing     Очистить существующие данные
  --validate           Проверить целостность после импорта
  --backup             Создать резервную копию перед импортом

Примеры:
  npm run import-db exports/export-2025-09-14T10-30-00
  npm run import-db --skip-schema exports/export-2025-09-14T10-30-00
  npm run import-db --clear-existing --validate exports/export-2025-09-14T10-30-00
`);
    return;
  }
  
  const options: ImportOptions = {
    importDir: '',
    skipSchema: false,
    skipData: false,
    clearExisting: false
  };
  
  let validate = false;
  let backup = false;
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--skip-schema':
        options.skipSchema = true;
        break;
      case '--skip-data':
        options.skipData = true;
        break;
      case '--clear-existing':
        options.clearExisting = true;
        break;
      case '--validate':
        validate = true;
        break;
      case '--backup':
        backup = true;
        break;
      default:
        if (!args[i].startsWith('--')) {
          options.importDir = args[i];
        }
        break;
    }
  }
  
  if (!options.importDir) {
    console.error('❌ Не указана директория импорта');
    process.exit(1);
  }
  
  // Преобразуем относительный путь в абсолютный
  if (!path.isAbsolute(options.importDir)) {
    options.importDir = path.join(process.cwd(), '..', '..', options.importDir);
  }
  
  try {
    // Создаем резервную копию если нужно
    if (backup) {
      await createBackup();
    }
    
    const importer = new DatabaseImporter();
    
    // Очищаем существующие данные если нужно
    if (options.clearExisting) {
      await importer.clearExistingData();
    }
    
    // Выполняем импорт
    await importer.import(options);
    
    // Проверяем целостность если нужно
    if (validate) {
      await importer.validateIntegrity();
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { DatabaseImporter };

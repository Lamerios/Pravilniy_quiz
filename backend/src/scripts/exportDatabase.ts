/**
 * Скрипт для экспорта базы данных квиз-игры
 * Экспортирует структуру таблиц и данные для переноса в другую базу
 */

import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

class DatabaseExporter {
  private pool: Pool;
  private config: DatabaseConfig;
  private exportDir: string;

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
    
    // Создаем директорию для экспорта
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    this.exportDir = path.join(process.cwd(), '..', '..', 'exports', `export-${timestamp}`);
  }

  /**
   * Основной метод экспорта
   */
  async export(): Promise<void> {
    try {
      console.log('🚀 Начинаем экспорт базы данных...');
      
      // Создаем директорию для экспорта
      await fs.mkdir(this.exportDir, { recursive: true });
      console.log(`📁 Создана директория экспорта: ${this.exportDir}`);

      // Экспортируем структуру
      await this.exportSchema();
      
      // Экспортируем данные
      await this.exportData();
      
      // Копируем файлы
      await this.copyFiles();
      
      // Создаем скрипт импорта
      await this.createImportScript();
      
      console.log('✅ Экспорт завершен успешно!');
      console.log(`📦 Файлы экспорта находятся в: ${this.exportDir}`);
      
    } catch (error) {
      console.error('❌ Ошибка при экспорте:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  /**
   * Экспорт структуры базы данных
   */
  private async exportSchema(): Promise<void> {
    console.log('📋 Экспортируем структуру базы данных...');
    
    const schemaSQL = `
-- Quiz Game Database Schema Export
-- Дата экспорта: ${new Date().toISOString()}
-- База данных: ${this.config.database}

-- Удаляем существующие таблицы (если есть)
DROP TABLE IF EXISTS round_scores CASCADE;
DROP TABLE IF EXISTS game_participants CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS template_rounds CASCADE;
DROP TABLE IF EXISTS game_templates CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

-- Teams table (справочник команд)
CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    logo_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Game templates table (шаблоны игр)
CREATE TABLE game_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Template rounds table (раунды шаблонов)
CREATE TABLE template_rounds (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES game_templates(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    max_score NUMERIC(5,1) NOT NULL
);

-- Games table (игры)
CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    template_id INTEGER REFERENCES game_templates(id),
    status VARCHAR(20) DEFAULT 'created', -- 'created', 'active', 'finished'
    current_round INTEGER DEFAULT 0,
    event_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Game participants table (участники игр)
CREATE TABLE game_participants (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    team_id INTEGER REFERENCES teams(id),
    table_number VARCHAR(64),
    table_code VARCHAR(64),
    participants_count INTEGER
);

-- Round scores table (баллы за раунды)
CREATE TABLE round_scores (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    team_id INTEGER REFERENCES teams(id),
    round_number INTEGER NOT NULL,
    score NUMERIC(5,1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_game_participants_game ON game_participants(game_id);
CREATE INDEX idx_round_scores_game_round ON round_scores(game_id, round_number);
CREATE UNIQUE INDEX idx_round_scores_unique ON round_scores(game_id, team_id, round_number);
CREATE INDEX idx_teams_name ON teams(name);

-- Комментарии к таблицам
COMMENT ON TABLE teams IS 'Справочник команд';
COMMENT ON TABLE game_templates IS 'Шаблоны игр';
COMMENT ON TABLE template_rounds IS 'Раунды шаблонов';
COMMENT ON TABLE games IS 'Игры';
COMMENT ON TABLE game_participants IS 'Участники игр';
COMMENT ON TABLE round_scores IS 'Баллы за раунды';
`;

    await fs.writeFile(path.join(this.exportDir, '01_schema.sql'), schemaSQL);
    console.log('✅ Структура базы данных экспортирована');
  }

  /**
   * Экспорт данных из всех таблиц
   */
  private async exportData(): Promise<void> {
    console.log('📊 Экспортируем данные...');
    
    const tables = [
      'teams',
      'game_templates', 
      'template_rounds',
      'games',
      'game_participants',
      'round_scores'
    ];

    let dataSQL = `-- Quiz Game Database Data Export
-- Дата экспорта: ${new Date().toISOString()}
-- База данных: ${this.config.database}

-- Отключаем проверки внешних ключей для импорта
SET session_replication_role = replica;

`;

    for (const table of tables) {
      console.log(`  📋 Экспортируем таблицу: ${table}`);
      
      // Получаем данные из таблицы
      const result = await this.pool.query(`SELECT * FROM ${table} ORDER BY id`);
      
      if (result.rows.length > 0) {
        dataSQL += `\n-- Данные таблицы ${table}\n`;
        dataSQL += `DELETE FROM ${table};\n`;
        
        // Получаем названия колонок
        const columns = Object.keys(result.rows[0]);
        
        for (const row of result.rows) {
          const values = columns.map(col => {
            const value = row[col];
            if (value === null) return 'NULL';
            if (typeof value === 'string') {
              return `'${value.replace(/'/g, "''")}'`;
            }
            if (value instanceof Date) {
              return `'${value.toISOString()}'`;
            }
            return value;
          });
          
          dataSQL += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
        }
        
        // Обновляем последовательность для SERIAL полей
        if (columns.includes('id')) {
          dataSQL += `SELECT setval('${table}_id_seq', (SELECT MAX(id) FROM ${table}));\n`;
        }
      } else {
        dataSQL += `\n-- Таблица ${table} пуста\n`;
      }
    }

    dataSQL += `\n-- Включаем обратно проверки внешних ключей
SET session_replication_role = DEFAULT;
`;

    await fs.writeFile(path.join(this.exportDir, '02_data.sql'), dataSQL);
    console.log('✅ Данные экспортированы');
  }

  /**
   * Копирование файлов (логотипы команд)
   */
  private async copyFiles(): Promise<void> {
    console.log('📁 Копируем файлы...');
    
    try {
      const uploadsDir = path.join(process.cwd(), '..', '..', 'uploads');
      const exportUploadsDir = path.join(this.exportDir, 'uploads');
      
      // Создаем директорию для файлов
      await fs.mkdir(exportUploadsDir, { recursive: true });
      
      // Проверяем существование директории uploads
      try {
        const files = await fs.readdir(uploadsDir);
        
        if (files.length > 0) {
          console.log(`  📋 Найдено файлов: ${files.length}`);
          
          for (const file of files) {
            const sourcePath = path.join(uploadsDir, file);
            const destPath = path.join(exportUploadsDir, file);
            await fs.copyFile(sourcePath, destPath);
            console.log(`  ✅ Скопирован: ${file}`);
          }
        } else {
          console.log('  📋 Файлы для копирования не найдены');
        }
      } catch (error) {
        console.log('  📋 Директория uploads не найдена или пуста');
      }
      
      console.log('✅ Файлы скопированы');
    } catch (error) {
      console.warn('⚠️  Предупреждение при копировании файлов:', error);
    }
  }

  /**
   * Создание скрипта импорта
   */
  private async createImportScript(): Promise<void> {
    console.log('📝 Создаем скрипт импорта...');
    
    const importScript = `#!/bin/bash
# Скрипт импорта базы данных квиз-игры
# Дата создания: ${new Date().toISOString()}

set -e

echo "🚀 Начинаем импорт базы данных..."

# Проверяем наличие psql
if ! command -v psql &> /dev/null; then
    echo "❌ psql не найден. Установите PostgreSQL client."
    exit 1
fi

# Параметры подключения (измените по необходимости)
DB_HOST=\${DB_HOST:-localhost}
DB_PORT=\${DB_PORT:-5432}
DB_NAME=\${DB_NAME:-quiz_game_new}
DB_USER=\${DB_USER:-quiz_user}

echo "📋 Параметры подключения:"
echo "  Хост: \$DB_HOST"
echo "  Порт: \$DB_PORT"
echo "  База: \$DB_NAME"
echo "  Пользователь: \$DB_USER"

# Проверяем подключение
echo "🔍 Проверяем подключение к базе данных..."
if ! psql -h "\$DB_HOST" -p "\$DB_PORT" -U "\$DB_USER" -d "\$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ Не удается подключиться к базе данных."
    echo "Проверьте параметры подключения и убедитесь, что база данных создана."
    exit 1
fi

# Импортируем структуру
echo "📋 Импортируем структуру базы данных..."
psql -h "\$DB_HOST" -p "\$DB_PORT" -U "\$DB_USER" -d "\$DB_NAME" -f "01_schema.sql"

# Импортируем данные
echo "📊 Импортируем данные..."
psql -h "\$DB_HOST" -p "\$DB_PORT" -U "\$DB_USER" -d "\$DB_NAME" -f "02_data.sql"

echo "✅ Импорт базы данных завершен успешно!"

# Копируем файлы (если есть)
if [ -d "uploads" ] && [ "\$(ls -A uploads)" ]; then
    echo "📁 Копируем файлы..."
    echo "Скопируйте содержимое папки 'uploads' в директорию загрузок вашего приложения."
    echo "Обычно это: ../uploads/ или /path/to/your/app/uploads/"
else
    echo "📁 Файлы для копирования не найдены"
fi

echo "🎉 Импорт завершен!"
`;

    await fs.writeFile(path.join(this.exportDir, 'import.sh'), importScript);
    
    // Создаем также Windows версию
    const importBat = `@echo off
REM Скрипт импорта базы данных квиз-игры для Windows
REM Дата создания: ${new Date().toISOString()}

echo 🚀 Начинаем импорт базы данных...

REM Параметры подключения (измените по необходимости)
if "%DB_HOST%"=="" set DB_HOST=localhost
if "%DB_PORT%"=="" set DB_PORT=5432
if "%DB_NAME%"=="" set DB_NAME=quiz_game_new
if "%DB_USER%"=="" set DB_USER=quiz_user

echo 📋 Параметры подключения:
echo   Хост: %DB_HOST%
echo   Порт: %DB_PORT%
echo   База: %DB_NAME%
echo   Пользователь: %DB_USER%

REM Проверяем наличие psql
where psql >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ psql не найден. Установите PostgreSQL client.
    pause
    exit /b 1
)

REM Импортируем структуру
echo 📋 Импортируем структуру базы данных...
psql -h "%DB_HOST%" -p "%DB_PORT%" -U "%DB_USER%" -d "%DB_NAME%" -f "01_schema.sql"
if %errorlevel% neq 0 (
    echo ❌ Ошибка при импорте структуры
    pause
    exit /b 1
)

REM Импортируем данные
echo 📊 Импортируем данные...
psql -h "%DB_HOST%" -p "%DB_PORT%" -U "%DB_USER%" -d "%DB_NAME%" -f "02_data.sql"
if %errorlevel% neq 0 (
    echo ❌ Ошибка при импорте данных
    pause
    exit /b 1
)

echo ✅ Импорт базы данных завершен успешно!

REM Информация о файлах
if exist "uploads" (
    echo 📁 Найдена папка uploads
    echo Скопируйте содержимое папки 'uploads' в директорию загрузок вашего приложения.
) else (
    echo 📁 Файлы для копирования не найдены
)

echo 🎉 Импорт завершен!
pause
`;

    await fs.writeFile(path.join(this.exportDir, 'import.bat'), importBat);
    
    console.log('✅ Скрипты импорта созданы');
  }

  /**
   * Получение статистики базы данных
   */
  async getStats(): Promise<void> {
    console.log('\n📊 Статистика базы данных:');
    
    const tables = [
      'teams',
      'game_templates', 
      'template_rounds',
      'games',
      'game_participants',
      'round_scores'
    ];

    for (const table of tables) {
      const result = await this.pool.query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`  ${table}: ${result.rows[0].count} записей`);
    }
  }
}

// Запуск экспорта
async function main() {
  try {
    const exporter = new DatabaseExporter();
    
    // Показываем статистику перед экспортом
    await exporter.getStats();
    
    // Выполняем экспорт
    await exporter.export();
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

// Запускаем только если файл вызван напрямую
if (require.main === module) {
  main();
}

export { DatabaseExporter };

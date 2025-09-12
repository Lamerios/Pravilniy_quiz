и попробовать запустить/**
 * Database initializer
 * Runs backend/src/db/init.sql once (idempotent via existence check)
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import fs from 'fs';
import { database } from './database';
import { logger } from '../utils/logger';

async function tableExists(tableName: string): Promise<boolean> {
  const result = await database.query(
    "SELECT to_regclass($1) IS NOT NULL AS exists",
    [tableName]
  );
  return result.rows?.[0]?.exists === true;
}

async function run(): Promise<void> {
  try {
    const exists = await tableExists('public.teams');
    if (exists) {
      logger.info('Database already initialized, skipping init.sql');
      return;
    }

    const sqlPath = path.resolve(__dirname, './init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await database.query(sql);
    logger.info('Database initialized successfully from init.sql');
  } catch (error) {
    logger.error('Database initialization failed', { error: (error as Error).message });
    process.exit(1);
  } finally {
    await database.close();
  }
}

run();



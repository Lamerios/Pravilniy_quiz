/**
 * Admin DB initializer (no psql required)
 * Connects as superuser and ensures role/db for app exist
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { logger } from '../utils/logger';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SUPER_USER = process.env.PG_SUPER_USER || 'postgres';
const SUPER_PASS = process.env.PG_SUPER_PASS || 'Lamerios7891';
const SUPER_HOST = process.env.PG_SUPER_HOST || process.env.DB_HOST || '127.0.0.1';
const SUPER_PORT = parseInt(process.env.PG_SUPER_PORT || process.env.DB_PORT || '5432', 10);

const APP_DB = process.env.DB_NAME || 'quiz_game_dev';
const APP_USER = process.env.DB_USER || 'quiz_user';
const APP_PASS = process.env.DB_PASSWORD || 'quiz_password';

async function run(): Promise<void> {
  const adminPool = new Pool({
    host: SUPER_HOST,
    port: SUPER_PORT,
    database: 'postgres',
    user: SUPER_USER,
    password: SUPER_PASS,
  });

  try {
    logger.info('Connecting as superuser to initialize DB');

    // Ensure role exists / update password
    await adminPool.query(
      `DO $$
       BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $1) THEN
           EXECUTE format('CREATE ROLE %I WITH LOGIN PASSWORD %L', $1, $2);
         ELSE
           EXECUTE format('ALTER ROLE %I WITH LOGIN PASSWORD %L', $1, $2);
         END IF;
       END
       $$;`,
      [APP_USER, APP_PASS]
    );
    logger.info('Role ensured', { role: APP_USER });

    // Ensure database exists and owner set
    await adminPool.query(
      `DO $$
       BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1) THEN
           PERFORM dblink_exec('dbname=''' || current_database() || '''',
             'CREATE DATABASE ' || quote_ident($1) || ' OWNER ' || quote_ident($2));
         END IF;
       END
       $$ LANGUAGE plpgsql;`,
      [APP_DB, APP_USER]
    ).catch(async (err) => {
      // Fallback without dblink: try simple CREATE DATABASE via EXECUTE
      if (String(err.message).includes('dblink') || String(err.message).includes('does not exist')) {
        await adminPool.query(
          `DO $$
           BEGIN
             IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1) THEN
               EXECUTE format('CREATE DATABASE %I OWNER %I', $1, $2);
             END IF;
           END
           $$;`,
          [APP_DB, APP_USER]
        );
      } else {
        throw err;
      }
    });
    logger.info('Database ensured', { database: APP_DB });

    // Grant privileges inside target DB
    const appDbPool = new Pool({
      host: SUPER_HOST,
      port: SUPER_PORT,
      database: APP_DB,
      user: SUPER_USER,
      password: SUPER_PASS,
    });

    await appDbPool.query('GRANT ALL PRIVILEGES ON DATABASE ' + APP_DB + ' TO ' + APP_USER);
    await appDbPool.query('GRANT USAGE ON SCHEMA public TO ' + APP_USER);
    await appDbPool.query('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ' + APP_USER);
    await appDbPool.query('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ' + APP_USER);
    await appDbPool.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ' + APP_USER);
    await appDbPool.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ' + APP_USER);

    await appDbPool.end();
    logger.info('Grants applied');
  } catch (error) {
    logger.error('Admin DB init failed', { error: (error as Error).message });
    process.exit(1);
  } finally {
    await adminPool.end();
  }
}

run();




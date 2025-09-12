-- Initialize PostgreSQL for Правильный Квиз
-- Creates/updates role quiz_user with password, creates DB quiz_game_dev and grants privileges

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'quiz_user') THEN
    CREATE ROLE quiz_user WITH LOGIN PASSWORD 'Lamerios7891';
  ELSE
    ALTER ROLE quiz_user WITH LOGIN PASSWORD 'Lamerios7891';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'quiz_game_dev') THEN
    CREATE DATABASE quiz_game_dev OWNER quiz_user;
  END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE quiz_game_dev TO quiz_user;

\connect quiz_game_dev

GRANT USAGE ON SCHEMA public TO quiz_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO quiz_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO quiz_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO quiz_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO quiz_user;




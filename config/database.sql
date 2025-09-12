-- PostgreSQL setup for Quiz Game
-- Run this script as superuser (postgres)

-- 1. Create user if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'quiz_user') THEN
    CREATE ROLE quiz_user WITH LOGIN PASSWORD 'quiz123';
  ELSE
    ALTER ROLE quiz_user WITH LOGIN PASSWORD 'quiz123';
  END IF;
END
$$;

-- 2. Create database if not exists
SELECT 'CREATE DATABASE quiz_game_dev2 OWNER quiz_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'quiz_game_dev2')\gexec

-- 3. Grant privileges
GRANT ALL PRIVILEGES ON DATABASE quiz_game_dev2 TO quiz_user;

-- Connect to the new database to set up permissions
\connect quiz_game_dev2

-- 4. Grant schema privileges
GRANT USAGE ON SCHEMA public TO quiz_user;
GRANT CREATE ON SCHEMA public TO quiz_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO quiz_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO quiz_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO quiz_user;

-- 5. Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO quiz_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO quiz_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO quiz_user;

-- 6. Verify setup
\echo 'Database setup complete!'
\echo 'User: quiz_user'
\echo 'Database: quiz_game_dev2'
\echo 'Password: quiz123'


-- Quiz Game Database Schema
-- Based on vision.md specifications

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

-- Insert sample data for development
INSERT INTO teams (name) VALUES 
    ('Команда Альфа'),
    ('Команда Бета'),
    ('Команда Гамма');

INSERT INTO game_templates (name, description) VALUES 
    ('Классический квиз', 'Стандартный формат квиза с несколькими раундами');

INSERT INTO template_rounds (template_id, round_number, name, max_score) VALUES 
    (1, 1, 'Разминка', 10),
    (1, 2, 'Основной раунд', 20),
    (1, 3, 'Финал', 30);


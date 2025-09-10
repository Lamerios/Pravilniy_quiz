# 🎯 vision.md - Техническое видение проекта "Правильный Квиз"

> **Максимально простое решение для проверки идеи по принципам KISS**
> 
> Отправная точка и технический проект для разработки системы управления интеллектуальными играми

---

## 🛠️ Технологии

### Frontend:
- **React** + **TypeScript**
- **Create React App** 
- **Socket.io-client** (real-time обновления)
- **CSS Modules** или обычный CSS

### Backend:
- **Node.js** + **Express** + **TypeScript**
- **Socket.io** (WebSocket сервер)
- **PostgreSQL** + **pg** (драйвер)
- **JWT** для аутентификации

### Инструменты разработки:
- **ESLint** + **Prettier** (базовые настройки)
- **Nodemon** для разработки
- **Docker** (для PostgreSQL в разработке)

---

## ⚡ Принципы разработки

### 1. **KISS - Keep It Simple, Stupid**
- ✅ Простейшее решение, которое работает
- ✅ Если есть сомнения - выбираем более простой путь
- ❌ Никаких "а что если в будущем..."

### 2. **Одна функция за раз (Single Feature Development)**
- ✅ Реализуем полностью одну фичу от API до UI
- ✅ Тестируем работоспособность перед переходом к следующей
- ❌ НЕ начинаем новую фичу, пока предыдущая не работает

### 3. **Вертикальные срезы (Vertical Slices)**
- ✅ База данных → API → UI для одной функции
- ✅ Например: "Создание команды" полностью, потом "Создание игры"
- ❌ НЕ все API сразу, потом весь фронтенд

### 4. **Fail Fast**
- ✅ Ошибка в коде = останавливаемся, исправляем
- ✅ Не понимаем требование = спрашиваем
- ✅ Тестируем каждые 2-3 файла

### 5. **Минимальное MVP**
- ✅ Только core функции из idea.md
- ❌ Никаких "nice to have" фич

### 6. **Документация кода**
- ✅ JSDoc для всех функций и API endpoints
- ✅ README для каждого модуля
- ✅ Комментарии для сложной бизнес-логики

### 7. **Рефакторинг сразу**
- ✅ Видишь дублирование - рефакторишь немедленно
- ✅ Файл стал больше 200 строк - разбиваешь
- ✅ Код стал нечитаемым - переписываешь

### 📋 Правила для AI Agent:

#### Файловые ограничения:
- ❌ Файлы больше 200 строк - разбивать на модули
- ❌ Более 3-4 новых файлов за раз
- ✅ Один компонент = один файл

#### Последовательность разработки:
- ✅ Сначала базовая структура проекта + DB схема
- ✅ Потом backend API endpoint за endpoint  
- ✅ Затем frontend компонент за компонентом
- ❌ НЕ писать весь код сразу

#### Тестирование каждого шага:
- ✅ Каждый endpoint тестируется отдельно
- ✅ Каждый компонент работает изолированно

---

## 📂 Структура проекта

```
quiz-game/
├── backend/                 # Node.js + Express API
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── models/         # Модели данных
│   │   ├── services/       # Бизнес-логика
│   │   ├── db/             # Подключение к БД
│   │   └── server.ts       # Точка входа
│   ├── tests/              # Backend тесты
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                # React приложение
│   ├── public/
│   ├── src/
│   │   ├── components/     # React компоненты
│   │   │   ├── admin/      # Админ панель
│   │   │   ├── scoreboard/ # Публичное табло
│   │   │   └── shared/     # Общие компоненты
│   │   ├── services/       # API клиенты
│   │   ├── types/          # TypeScript типы
│   │   └── App.tsx
│   ├── tests/              # Frontend тесты
│   ├── package.json
│   └── tsconfig.json
│
├── shared/                  # Общие типы для frontend/backend
│   └── types.ts
│
├── docker-compose.yml       # PostgreSQL для разработки
├── README.md
└── .gitignore
```

### Правила структуры:
- ✅ Максимум 3 уровня вложенности
- ✅ Один файл = одна ответственность
- ✅ Имена папок в kebab-case
- ✅ Имена файлов описывают содержимое

---

## 🏗️ Архитектура проекта

### Общая архитектура:
```
┌─────────────────┐    ┌─────────────────┐
│   Admin Panel   │    │   Public Board  │
│   (React App)   │    │   (React App)   │
└─────────────────┘    └─────────────────┘
         │                       │
         └─────────┬─────────────┘
                   │
            HTTP + WebSocket
                   │
┌─────────────────────────────────────────┐
│            Backend Server                │
│  ┌─────────────────────────────────────┐ │
│  │         Middleware Layer            │ │
│  │    (Auth, Validation, CORS)         │ │
│  └─────────────────────────────────────┘ │
│  ┌─────────────┐    ┌─────────────────┐ │
│  │ REST API    │    │ WebSocket       │ │
│  │ (Express)   │    │ (Socket.io)     │ │
│  └─────────────┘    └─────────────────┘ │
│  ┌─────────────────────────────────────┐ │
│  │        Business Logic              │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                   │
        ┌─────────────────┐
        │   PostgreSQL    │
        │   + File System │
        │   (team logos)  │
        └─────────────────┘
```

### Принципы:
- ✅ **Простые слои**: Presentation → API → Business → Data
- ✅ **Middleware**: JWT auth, валидация входных данных
- ✅ **Файлы**: Логотипы в `/uploads` папке
- ✅ **Real-time**: Socket.io только для обновления табло

---

## 🗄️ Модель данных

### Основные таблицы:

```sql
-- Команды (справочник)
teams
├── id (serial, PK)
├── name (varchar(100), unique, not null)
├── logo_path (varchar(255), nullable)
├── created_at (timestamp, default: now())

-- Шаблоны игр
game_templates  
├── id (serial, PK)
├── name (varchar(100), not null)
├── description (text, nullable)
├── created_at (timestamp, default: now())

-- Раунды шаблона
template_rounds
├── id (serial, PK)
├── template_id (integer, FK → game_templates.id)
├── round_number (integer, not null)
├── name (varchar(100), not null)
├── max_score (integer, not null)

-- Игры
games
├── id (serial, PK) 
├── name (varchar(100), not null)
├── template_id (integer, FK → game_templates.id)
├── status (varchar(20), default: 'created') -- 'created', 'active', 'finished'
├── current_round (integer, default: 0)
├── created_at (timestamp, default: now())

-- Участники игры
game_participants
├── id (serial, PK)
├── game_id (integer, FK → games.id)
├── team_id (integer, FK → teams.id)
├── table_number (integer, nullable)

-- Баллы за раунды
round_scores
├── id (serial, PK)
├── game_id (integer, FK → games.id) 
├── team_id (integer, FK → teams.id)
├── round_number (integer, not null)
├── score (integer, default: 0)
├── created_at (timestamp, default: now())
```

### Индексы:
```sql
-- Поиск по играм
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_game_participants_game ON game_participants(game_id);

-- Поиск баллов
CREATE INDEX idx_round_scores_game_round ON round_scores(game_id, round_number);
CREATE UNIQUE INDEX idx_round_scores_unique ON round_scores(game_id, team_id, round_number);

-- Поиск команд
CREATE INDEX idx_teams_name ON teams(name);
```

---

## 🎬 Сценарии работы

### Порядок реализации:

### 1. Сценарий: Создание шаблонов игр
```
1. Логин в админ-панель
2. Создание нового шаблона
3. Ввод названия и описания
4. Добавление раундов:
   - Название раунда
   - Максимальный балл за раунд
5. Сохранение шаблона
```

### 2. Сценарий: Управление командами
```
1. Создание новой команды
2. Ввод названия команды
3. Загрузка логотипа (опционально)
4. Сохранение команды
5. Редактирование существующих команд
```

### 3. Сценарий: Администратор создает игру
```
1. Логин в админ-панель
2. Выбор шаблона игры из списка
3. Ввод названия игры
4. Добавление команд-участников из справочника
5. Назначение номеров столов
6. Создание игры → статус "created"
```

### 4. Сценарий: Проведение игры
```
1. Старт игры → статус "active"
2. Для каждого раунда:
   - Переключение на следующий раунд
   - Сбор бланков ответов от команд
   - Ввод баллов в админ-панели
   - Корректировка баллов при необходимости
   - Автоматическое обновление табло
3. Завершение игры → статус "finished"
```

### 5. Сценарий: Зритель смотрит табло
```
1. Переход по ссылке табло (без регистрации)
2. Просмотр текущих результатов
3. Автоматическое обновление при изменении баллов
4. Отображение текущего раунда
```

---

## 🚀 Деплой

### Простой деплой на Ubuntu:

```bash
# Структура на сервере
/var/www/quiz-game/
├── backend/              # Node.js приложение
├── frontend/build/       # Собранный React (статика)
├── uploads/             # Логотипы команд
├── logs/               # Логи приложения
├── scripts/            # Скрипты управления
├── ssl/                # Самоподписанные сертификаты
├── backups/            # Бэкапы БД
└── imports/            # CSV файлы для импорта
```

### Компоненты:
1. **Nginx** - прокси + статика (HTTP/HTTPS + домен/IP)
2. **PM2** - управление Node.js + web interface
3. **PostgreSQL** - локально на сервере
4. **Systemd** - автозапуск при перезагрузке

### SSL:
```bash
# Генерация самоподписанного сертификата
openssl req -x509 -newkey rsa:4096 -keyout ssl/quiz.key -out ssl/quiz.crt -days 365 -nodes
```

### Автоматический бэкап:
```bash
# Cron job - ежедневно в 3:00
0 3 * * * pg_dump quiz_game > /var/www/quiz-game/backups/backup_$(date +\%Y\%m\%d).sql
```

### Импорт из CSV:
```bash
# Скрипт импорта команд/игр
node scripts/import-csv.js --file=/path/to/teams.csv --type=teams
```

### Процесс деплоя:
```bash
# 1. Сборка фронтенда
npm run build

# 2. Перезапуск бэкенда
pm2 restart quiz-backend

# 3. Обновление nginx
sudo nginx -s reload
```

---

## ⚙️ Подход к конфигурированию

### Структура конфигурации:

```bash
# Backend
backend/.env.development
backend/.env.production
backend/.env.example

# Frontend
frontend/.env.development  
frontend/.env.production
frontend/.env.example
```

### Backend конфигурация (.env):
```bash
# Server
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=quiz_game
DB_USER=quiz_user
DB_PASSWORD=secure_password

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=24h

# Admin
ADMIN_PASSWORD=admin_password_here

# Files
UPLOAD_PATH=/var/www/quiz-game/uploads
MAX_FILE_SIZE=5MB

# Logs
LOG_LEVEL=info
LOG_FILE=/var/www/quiz-game/logs/app.log
```

### Frontend конфигурация (.env):
```bash
# API
REACT_APP_API_URL=https://your-domain.com/api
REACT_APP_WS_URL=wss://your-domain.com

# Features
REACT_APP_MAX_TEAMS_PER_GAME=20
REACT_APP_AUTO_REFRESH_INTERVAL=5000
```

### Особенности:
- ✅ **Валидация при старте**: Проверка всех обязательных переменных
- ✅ **Hot reload**: Возможность обновления конфига без рестарта
- ✅ **Типизация**: TypeScript интерфейсы для конфига

---

## 📝 Подход к логгированию

### Библиотека: Winston (Backend) + console (Frontend)

### Уровни логов:
```javascript
{
  error: 0,    // Ошибки приложения
  warn: 1,     // Предупреждения 
  info: 2,     // Общая информация + все API запросы
  debug: 3     // Отладочная информация
}
```

### Что логируем:

**Backend (все API запросы):**
```javascript
// Все HTTP запросы
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { 
    ip: req.ip, 
    userAgent: req.get('User-Agent'),
    responseTime: Date.now() - req.startTime
  });
});

// Ошибки
logger.error('Database connection failed', { error: err.message, stack: err.stack });

// Бизнес-события  
logger.info('Game started', { gameId: 123, teamsCount: 8 });
logger.info('Score updated', { gameId: 123, teamId: 45, score: 15, round: 2 });
```

**Frontend:**
```javascript
// Только ошибки и важные события
console.error('API request failed', error);
console.info('Game started', gameData);
```

### Конфигурация:
- **Файлы**: `app.log`, `error.log` 
- **Ротация**: ежедневно, хранить 14 дней
- **Формат**: JSON для парсинга
- **Асинхронное**: non-blocking логирование
- **Мониторинг**: готовность к интеграции с внешними системами

---

## 🎯 Заключение

Данный документ определяет техническое видение проекта "Правильный Квиз" с упором на простоту, надежность и быструю реализацию MVP.

### Ключевые принципы:
- ✅ **KISS** - максимальная простота
- ✅ **Поэтапная разработка** - одна функция за раз
- ✅ **Вертикальные срезы** - от БД до UI
- ✅ **Fail Fast** - быстрое выявление проблем

### Порядок разработки:
1. **Шаблоны игр** → 2. **Команды** → 3. **Создание игр** → 4. **Проведение игр** → 5. **Публичное табло**

> 💡 **Главная цель**: Создать рабочий прототип для проверки бизнес-идеи с минимальными затратами времени и ресурсов.
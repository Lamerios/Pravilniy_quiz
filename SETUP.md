# 🚀 Настройка проекта "Правильный Квиз"

## Требования
- Node.js 18+
- PostgreSQL 14+
- npm или yarn

## Быстрый старт

### 1. Настройка Backend

```bash
cd backend
```

Создайте файл `.env`:
```env
NODE_ENV=development
DB_HOST=127.0.0.1
DB_PORT=5433
DB_NAME=quiz_game_dev2
DB_USER=quiz_user
DB_PASSWORD=quiz123
BACKEND_PORT=5001
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=24h
ADMIN_PASSWORD=admin_password
UPLOAD_PATH=../uploads
MAX_FILE_SIZE=5242880
LOG_LEVEL=info
LOG_PATH=../logs
```

Установите зависимости и запустите:
```bash
npm install
npm run db:seed  # Инициализация БД
npm run dev      # Запуск сервера
```

### 2. Настройка Frontend

```bash
cd frontend
```

Создайте файл `.env`:
```env
REACT_APP_API_URL=http://localhost:5001
REACT_APP_WS_URL=ws://localhost:5001
```

Установите зависимости и запустите:
```bash
npm install
npm start
```

### 3. Настройка PostgreSQL

#### Вариант A: Локальный PostgreSQL

Создайте пользователя и базу данных:
```sql
CREATE USER quiz_user WITH PASSWORD 'quiz123';
CREATE DATABASE quiz_game_dev2 OWNER quiz_user;
GRANT ALL PRIVILEGES ON DATABASE quiz_game_dev2 TO quiz_user;
```

#### Вариант B: Docker

```bash
docker compose up -d
```

## Проверка работоспособности

1. Backend API: http://localhost:5001/health
2. Frontend: http://localhost:3000
3. API Teams: http://localhost:5001/api/teams

## Структура проекта

```
quiz-game/
├── backend/          # Node.js API
├── frontend/         # React приложение  
├── uploads/          # Загруженные файлы
├── logs/            # Логи приложения
└── scripts/         # Вспомогательные скрипты
```

## Известные проблемы и решения

### Frontend не запускается
- Убедитесь что создан файл `frontend/.env`
- Проверьте версию Node.js (должна быть 18+)

### Backend не подключается к БД
- Проверьте настройки в `backend/.env`
- Убедитесь что PostgreSQL запущен на порту 5433
- Проверьте пароль пользователя quiz_user

### Ошибка импорта модулей
- Удалите `node_modules` и переустановите: `npm install`


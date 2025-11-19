#!/bin/bash

# Скрипт для восстановления базы данных Quiz Game из бэкапа
set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функции для вывода
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Проверка аргументов
if [ $# -eq 0 ]; then
    log_error "Использование: $0 <путь_к_бэкапу>"
    echo "Доступные бэкапы:"
    find backups -name "*.sql.gz" -type f | sort -r | head -10
    exit 1
fi

BACKUP_FILE=$1

# Проверка существования файла бэкапа
if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Файл бэкапа не найден: $BACKUP_FILE"
    exit 1
fi

# Проверка наличия config.env
if [ ! -f "config.env" ]; then
    log_error "Файл config.env не найден."
    exit 1
fi

# Загрузка переменных окружения
source config.env

log_warning "ВНИМАНИЕ: Это действие полностью заменит текущую базу данных!"
log_warning "Бэкап: $BACKUP_FILE"
read -p "Продолжить? (yes/no): " -r
if [ "$REPLY" != "yes" ]; then
    log_info "Операция отменена"
    exit 0
fi

# Создание бэкапа текущего состояния
log_info "Создание бэкапа текущего состояния..."
./scripts/deploy/backup.sh

# Остановка backend для безопасного восстановления
log_info "Остановка backend сервиса..."
docker-compose -f docker-compose.prod.yml stop backend

# Распаковка бэкапа если он сжат
if [[ $BACKUP_FILE == *.gz ]]; then
    log_info "Распаковка бэкапа..."
    TEMP_FILE=$(mktemp)
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
    BACKUP_FILE="$TEMP_FILE"
fi

# Восстановление базы данных
log_info "Восстановление базы данных..."
docker exec -i quiz-game-db-prod psql \
    -U $DB_USER \
    -d postgres \
    --quiet < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    log_success "База данных восстановлена успешно"
else
    log_error "Ошибка при восстановлении базы данных"
    exit 1
fi

# Удаление временного файла
if [ -n "$TEMP_FILE" ]; then
    rm -f "$TEMP_FILE"
fi

# Запуск backend сервиса
log_info "Запуск backend сервиса..."
docker-compose -f docker-compose.prod.yml start backend

# Ожидание готовности сервиса
log_info "Ожидание готовности сервиса..."
sleep 15

# Проверка работоспособности
if curl -f http://localhost:5001/health > /dev/null 2>&1; then
    log_success "Сервис восстановлен и работает"
else
    log_warning "Сервис может быть недоступен, проверьте логи"
fi

log_success "Восстановление завершено!"

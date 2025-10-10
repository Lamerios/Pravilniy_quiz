#!/bin/bash

# Скрипт для создания бэкапов базы данных Quiz Game
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

# Проверка наличия config.env
if [ ! -f "config.env" ]; then
    log_error "Файл config.env не найден."
    exit 1
fi

# Загрузка переменных окружения
source config.env

# Создание директории для бэкапов
BACKUP_DIR="backups/$(date +%Y/%m)"
mkdir -p $BACKUP_DIR

# Имя файла бэкапа
BACKUP_FILE="$BACKUP_DIR/quiz_game_backup_$(date +%Y%m%d_%H%M%S).sql"

log_info "Создание бэкапа базы данных..."

# Создание бэкапа базы данных
docker exec quiz-game-db-prod pg_dump \
    -U $DB_USER \
    -d $DB_NAME \
    --no-password \
    --clean \
    --if-exists \
    --create > $BACKUP_FILE

if [ $? -eq 0 ]; then
    log_success "Бэкап создан: $BACKUP_FILE"
    
    # Сжатие бэкапа
    gzip $BACKUP_FILE
    log_info "Бэкап сжат: ${BACKUP_FILE}.gz"
    
    # Размер файла
    SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
    log_info "Размер бэкапа: $SIZE"
    
else
    log_error "Ошибка при создании бэкапа"
    exit 1
fi

# Бэкап загруженных файлов
log_info "Создание бэкапа загруженных файлов..."
UPLOADS_BACKUP="$BACKUP_DIR/uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz"

if docker run --rm \
    -v quiz-game_uploads_prod:/uploads \
    -v $(pwd)/$BACKUP_DIR:/backup \
    alpine:latest \
    tar -czf /backup/$(basename $UPLOADS_BACKUP) -C /uploads .; then
    log_success "Бэкап файлов создан: $UPLOADS_BACKUP"
else
    log_warning "Ошибка при создании бэкапа файлов"
fi

# Очистка старых бэкапов (старше N дней)
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
log_info "Удаление бэкапов старше $RETENTION_DAYS дней..."

find backups -name "*.gz" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

# Статистика бэкапов
TOTAL_BACKUPS=$(find backups -name "*.gz" -type f | wc -l)
TOTAL_SIZE=$(du -sh backups 2>/dev/null | cut -f1)

log_info "Всего бэкапов: $TOTAL_BACKUPS"
log_info "Общий размер: $TOTAL_SIZE"

log_success "Процесс бэкапа завершен!"

#!/bin/bash

# Скрипт для деплоя Quiz Game в production
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

# Проверка, что скрипт запущен из корня проекта
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "Файл docker-compose.prod.yml не найден. Запустите скрипт из корня проекта."
    exit 1
fi

# Проверка наличия config.env
if [ -f "config.env.local" ]; then
    CONFIG_FILE="config.env.local"
elif [ -f "config.env.production" ]; then
    CONFIG_FILE="config.env.production"
elif [ -f "config.env" ]; then
    CONFIG_FILE="config.env"
else
    log_error "Файл конфигурации не найден. Запустите ./setup-production.sh"
    exit 1
fi

log_info "Используется файл конфигурации: $CONFIG_FILE"

# Загрузка переменных окружения
source $CONFIG_FILE

# Проверка обязательных переменных
required_vars=("DB_PASSWORD" "JWT_SECRET" "DOMAIN" "EMAIL")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ] || [[ "${!var}" == *"ЗАМЕНИТЕ"* ]]; then
        log_error "Переменная $var не настроена в config.env"
        exit 1
    fi
done

log_info "Начинаем деплой Quiz Game..."

# Создание необходимых директорий
log_info "Создание директорий..."
mkdir -p logs/nginx config/nginx/ssl

# Определение команды docker compose
get_compose_cmd() {
    if command -v docker-compose &> /dev/null; then
        echo "docker-compose"
    else
        echo "docker compose"
    fi
}

COMPOSE_CMD=$(get_compose_cmd)

# Остановка существующих контейнеров
log_info "Остановка существующих контейнеров..."
$COMPOSE_CMD --env-file $CONFIG_FILE -f docker-compose.prod.yml down --remove-orphans || true

# Очистка неиспользуемых образов (опционально)
if [ "${CLEANUP_IMAGES:-n}" = "y" ]; then
    log_info "Очистка неиспользуемых образов..."
    docker system prune -f
else
    log_info "Пропускаем очистку образов (установите CLEANUP_IMAGES=y для автоматической очистки)"
fi

# Загрузка готовых образов (если еще не загружены)
if ! docker images | grep -q "quiz-game-backend:v1"; then
    log_info "Загрузка готовых Docker образов..."
    ./scripts/deploy/load-images.sh
fi

# Запуск контейнеров
log_info "Запуск контейнеров..."
$COMPOSE_CMD --env-file $CONFIG_FILE -f docker-compose.prod.yml up -d

# Ожидание готовности сервисов
log_info "Ожидание готовности сервисов..."
sleep 30

# Проверка состояния контейнеров
log_info "Проверка состояния контейнеров..."
if $COMPOSE_CMD --env-file $CONFIG_FILE -f docker-compose.prod.yml ps | grep -q "Exit"; then
    log_error "Некоторые контейнеры завершились с ошибкой:"
    $COMPOSE_CMD --env-file $CONFIG_FILE -f docker-compose.prod.yml ps
    log_error "Проверьте логи: $COMPOSE_CMD --env-file $CONFIG_FILE -f docker-compose.prod.yml logs"
    exit 1
fi

# Проверка доступности сервисов
log_info "Проверка доступности сервисов..."

# Проверка backend
if curl -f http://localhost:5001/health > /dev/null 2>&1; then
    log_success "Backend доступен"
else
    log_warning "Backend недоступен, проверьте логи"
fi

# Проверка frontend
if curl -f http://localhost:80 > /dev/null 2>&1; then
    log_success "Frontend доступен"
else
    log_warning "Frontend недоступен, проверьте логи"
fi

log_success "Деплой завершен!"
log_info "Доступные команды:"
echo "  - Просмотр логов: $COMPOSE_CMD --env-file $CONFIG_FILE -f docker-compose.prod.yml logs -f"
echo "  - Остановка: $COMPOSE_CMD --env-file $CONFIG_FILE -f docker-compose.prod.yml down"
echo "  - Рестарт: $COMPOSE_CMD --env-file $CONFIG_FILE -f docker-compose.prod.yml restart"
echo "  - Статус: $COMPOSE_CMD --env-file $CONFIG_FILE -f docker-compose.prod.yml ps"

if [ -z "$SSL_CONFIGURED" ]; then
    log_warning "SSL не настроен. Запустите scripts/deploy/setup-ssl.sh для настройки HTTPS"
fi

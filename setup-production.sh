#!/bin/bash

# Скрипт подготовки production окружения для Quiz Game
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

# Функция генерации случайного пароля
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Функция генерации JWT секрета
generate_jwt_secret() {
    openssl rand -base64 64 | tr -d "=+/\n" | cut -c1-64
}

log_info "Настройка production окружения для Quiz Game"
log_info "Домен: vds2815517.my-ihor.ru"
log_info "IP: 92.62.119.17"

# Генерация паролей
DB_PASSWORD=$(generate_password)
JWT_SECRET=$(generate_jwt_secret)
GRAFANA_PASSWORD=$(generate_password)

log_info "Генерация безопасных паролей..."

# Создание production конфигурации
cat > config.env.production << EOF
# Production Environment Variables
# Автоматически сгенерировано $(date)

# База данных
DB_NAME=quiz_game_prod
DB_USER=quiz_user_prod
DB_PASSWORD=$DB_PASSWORD

# JWT секрет
JWT_SECRET=$JWT_SECRET

# CORS настройки
CORS_ORIGIN=https://vds2815517.my-ihor.ru

# API URL для фронтенда
REACT_APP_API_URL=https://vds2815517.my-ihor.ru/api

# Rate limiting настройки
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Домен для SSL сертификата
DOMAIN=vds2815517.my-ihor.ru
EMAIL=admin@vds2815517.my-ihor.ru

# Настройки мониторинга
ENABLE_MONITORING=true
GRAFANA_ADMIN_PASSWORD=$GRAFANA_PASSWORD

# Настройки бэкапов
BACKUP_SCHEDULE="0 2 * * *"
BACKUP_RETENTION_DAYS=30

# SSL конфигурация
SSL_CONFIGURED=false
EOF

log_success "Создан файл config.env.production с безопасными паролями"

# Копирование в рабочий файл
cp config.env.production config.env.local
log_success "Создан рабочий файл config.env.local"

# Вывод информации о паролях
echo ""
log_warning "ВАЖНО! Сохраните эти пароли в безопасном месте:"
echo "========================================================"
echo "База данных пароль: $DB_PASSWORD"
echo "JWT секрет: $JWT_SECRET"
echo "Grafana пароль: $GRAFANA_PASSWORD"
echo "========================================================"
echo ""

# Создание директорий
log_info "Создание необходимых директорий..."
mkdir -p logs/nginx backups config/nginx/ssl

# Проверка Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker не установлен. Установите Docker перед продолжением."
    exit 1
fi

if ! docker compose version &> /dev/null; then
    log_error "Docker Compose не установлен. Установите Docker Compose перед продолжением."
    exit 1
fi

log_success "Docker и Docker Compose найдены"

# Проверка готовых образов
if [ -f "backend_v1.tar" ] && [ -f "frontend_v1.tar" ]; then
    log_info "Готовые образы найдены, загружаем..."
    ./manage.sh load-images
else
    log_warning "Готовые образы не найдены. Убедитесь, что backend_v1.tar и frontend_v1.tar находятся в корне проекта."
fi

log_success "Подготовка завершена!"
echo ""
log_info "Следующие шаги:"
echo "1. Проверьте настройки в config.env.local"
echo "2. Запустите систему: ./manage.sh deploy"
echo "3. Настройте SSL: ./manage.sh ssl-setup"
echo "4. Проверьте работу: http://vds2815517.my-ihor.ru"

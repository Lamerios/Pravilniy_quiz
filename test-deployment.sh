#!/bin/bash

# Скрипт тестирования развертывания Quiz Game
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

DOMAIN="vds2815517.my-ihor.ru"
IP="92.62.119.17"

log_info "Тестирование развертывания Quiz Game"
log_info "Домен: $DOMAIN"
log_info "IP: $IP"

# Проверка Docker образов
log_info "Проверка Docker образов..."
if docker images | grep -q "quiz-game-backend:v1"; then
    log_success "Backend образ найден"
else
    log_error "Backend образ не найден"
fi

if docker images | grep -q "quiz-game-frontend:v1"; then
    log_success "Frontend образ найден"
else
    log_error "Frontend образ не найден"
fi

# Проверка конфигурационных файлов
log_info "Проверка конфигурации..."
if [ -f "config.env.local" ]; then
    log_success "Файл config.env.local найден"
else
    log_warning "Файл config.env.local не найден. Запустите ./setup-production.sh"
fi

if [ -f "docker-compose.prod.yml" ]; then
    log_success "Файл docker-compose.prod.yml найден"
else
    log_error "Файл docker-compose.prod.yml не найден"
fi

# Проверка портов
log_info "Проверка доступности портов..."
check_port() {
    local port=$1
    if netstat -tuln 2>/dev/null | grep -q ":$port "; then
        log_warning "Порт $port уже используется"
        netstat -tuln | grep ":$port "
    else
        log_success "Порт $port свободен"
    fi
}

check_port 80
check_port 443
check_port 5432

# Проверка места на диске
log_info "Проверка места на диске..."
DISK_USAGE=$(df -h . | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    log_warning "Использование диска: ${DISK_USAGE}%"
else
    log_success "Использование диска: ${DISK_USAGE}%"
fi

# Проверка памяти
log_info "Проверка памяти..."
MEMORY_MB=$(free -m | grep '^Mem:' | awk '{print $2}')
if [ $MEMORY_MB -lt 4000 ]; then
    log_warning "Доступно памяти: ${MEMORY_MB}MB (рекомендуется минимум 4GB)"
else
    log_success "Доступно памяти: ${MEMORY_MB}MB"
fi

# Проверка сетевого подключения
log_info "Проверка сетевого подключения..."
if curl -s --connect-timeout 5 http://google.com > /dev/null; then
    log_success "Интернет соединение работает"
else
    log_error "Проблемы с интернет соединением"
fi

# Проверка DNS
log_info "Проверка DNS для домена $DOMAIN..."
if ping -c 1 -W 5 $DOMAIN > /dev/null 2>&1; then
    log_success "Домен $DOMAIN доступен"
else
    log_warning "Проблемы с доступностью домена $DOMAIN"
fi

# Тест запуска контейнера PostgreSQL
log_info "Тестирование запуска PostgreSQL..."
if docker run --rm --name test-postgres -e POSTGRES_PASSWORD=test -d postgres:15-alpine > /dev/null 2>&1; then
    sleep 5
    if docker ps | grep -q test-postgres; then
        log_success "PostgreSQL контейнер запускается корректно"
        docker stop test-postgres > /dev/null 2>&1
    else
        log_error "PostgreSQL контейнер не запустился"
    fi
else
    log_error "Не удалось запустить PostgreSQL контейнер"
fi

echo ""
log_info "Рекомендации для развертывания:"
echo "1. Убедитесь, что все порты (80, 443, 5432) свободны"
echo "2. Проверьте, что у вас достаточно места на диске (минимум 20GB свободно)"
echo "3. Убедитесь, что домен $DOMAIN корректно настроен в DNS"
echo "4. Запустите ./setup-production.sh для подготовки конфигурации"
echo "5. Выполните ./manage.sh deploy для развертывания"

log_success "Тестирование завершено!"

#!/bin/bash

# Скрипт для загрузки готовых Docker образов Quiz Game
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

# Проверка наличия архивов
if [ ! -f "backend_v1.tar" ]; then
    log_error "Файл backend_v1.tar не найден"
    exit 1
fi

if [ ! -f "frontend_v1.tar" ]; then
    log_error "Файл frontend_v1.tar не найден"
    exit 1
fi

log_info "Загрузка готовых Docker образов..."

# Загрузка backend образа
log_info "Загрузка backend образа..."
if docker load -i backend_v1.tar; then
    log_success "Backend образ загружен: quiz-game-backend:v1"
else
    log_error "Ошибка загрузки backend образа"
    exit 1
fi

# Загрузка frontend образа
log_info "Загрузка frontend образа..."
if docker load -i frontend_v1.tar; then
    log_success "Frontend образ загружен: quiz-game-frontend:v1"
else
    log_error "Ошибка загрузки frontend образа"
    exit 1
fi

# Проверка загруженных образов
log_info "Проверка загруженных образов:"
docker images | grep quiz-game

log_success "Все образы успешно загружены!"
log_info "Теперь можно запустить систему командой: ./manage.sh start"

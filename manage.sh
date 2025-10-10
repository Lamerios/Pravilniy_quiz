#!/bin/bash

# Главный скрипт управления Quiz Game
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

show_help() {
    echo "Quiz Game - Система управления"
    echo ""
    echo "Использование: $0 [команда]"
    echo ""
    echo "Команды:"
    echo "  deploy      - Полный деплой в production"
    echo "  load-images - Загрузка готовых Docker образов"
    echo "  start       - Запуск всех сервисов"
    echo "  stop        - Остановка всех сервисов"
    echo "  restart     - Перезапуск всех сервисов"
    echo "  status      - Статус контейнеров"
    echo "  logs        - Просмотр логов"
    echo "  backup      - Создание бэкапа"
    echo "  restore     - Восстановление из бэкапа"
    echo "  ssl-setup   - Настройка SSL сертификата"
    echo "  ssl-renew   - Обновление SSL сертификата"
    echo "  update      - Обновление и перезапуск"
    echo "  clean       - Очистка неиспользуемых ресурсов"
    echo "  monitor     - Мониторинг ресурсов"
    echo "  help        - Показать эту справку"
    echo ""
}

# Проверка Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker не установлен"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose не установлен"
        exit 1
    fi
}

# Определение команды docker compose
get_compose_cmd() {
    if command -v docker-compose &> /dev/null; then
        echo "docker-compose"
    else
        echo "docker compose"
    fi
}

# Определение файла docker-compose
get_compose_file() {
    if [ -f "docker-compose.prod.yml" ]; then
        echo "docker-compose.prod.yml"
    else
        echo "docker-compose.yml"
    fi
}

case "${1:-help}" in
    deploy)
        log_info "Запуск полного деплоя..."
        ./scripts/deploy/deploy.sh
        ;;
    
    load-images)
        log_info "Загрузка готовых Docker образов..."
        ./scripts/deploy/load-images.sh
        ;;
    
    start)
        COMPOSE_CMD=$(get_compose_cmd)
        COMPOSE_FILE=$(get_compose_file)
        log_info "Запуск сервисов..."
        $COMPOSE_CMD -f $COMPOSE_FILE up -d
        log_success "Сервисы запущены"
        ;;
    
    stop)
        COMPOSE_CMD=$(get_compose_cmd)
        COMPOSE_FILE=$(get_compose_file)
        log_info "Остановка сервисов..."
        $COMPOSE_CMD -f $COMPOSE_FILE down
        log_success "Сервисы остановлены"
        ;;
    
    restart)
        COMPOSE_CMD=$(get_compose_cmd)
        COMPOSE_FILE=$(get_compose_file)
        log_info "Перезапуск сервисов..."
        $COMPOSE_CMD -f $COMPOSE_FILE restart
        log_success "Сервисы перезапущены"
        ;;
    
    status)
        COMPOSE_CMD=$(get_compose_cmd)
        COMPOSE_FILE=$(get_compose_file)
        log_info "Статус контейнеров:"
        $COMPOSE_CMD -f $COMPOSE_FILE ps
        echo ""
        log_info "Использование ресурсов:"
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
        ;;
    
    logs)
        COMPOSE_CMD=$(get_compose_cmd)
        COMPOSE_FILE=$(get_compose_file)
        SERVICE=${2:-""}
        if [ -n "$SERVICE" ]; then
            log_info "Логи сервиса $SERVICE:"
            $COMPOSE_CMD -f $COMPOSE_FILE logs -f $SERVICE
        else
            log_info "Логи всех сервисов:"
            $COMPOSE_CMD -f $COMPOSE_FILE logs -f
        fi
        ;;
    
    backup)
        log_info "Создание бэкапа..."
        ./scripts/deploy/backup.sh
        ;;
    
    restore)
        if [ -z "$2" ]; then
            log_error "Укажите путь к файлу бэкапа"
            echo "Доступные бэкапы:"
            find backups -name "*.sql.gz" -type f | sort -r | head -5
            exit 1
        fi
        ./scripts/deploy/restore.sh "$2"
        ;;
    
    ssl-setup)
        log_info "Настройка SSL..."
        ./scripts/deploy/setup-ssl.sh
        ;;
    
    ssl-renew)
        log_info "Обновление SSL сертификата..."
        ./scripts/deploy/renew-ssl.sh
        ;;
    
    update)
        COMPOSE_CMD=$(get_compose_cmd)
        COMPOSE_FILE=$(get_compose_file)
        log_info "Обновление системы..."
        $COMPOSE_CMD -f $COMPOSE_FILE pull
        $COMPOSE_CMD -f $COMPOSE_FILE build --no-cache
        $COMPOSE_CMD -f $COMPOSE_FILE up -d
        log_success "Система обновлена"
        ;;
    
    clean)
        log_info "Очистка неиспользуемых ресурсов..."
        docker system prune -f
        docker volume prune -f
        log_success "Очистка завершена"
        ;;
    
    monitor)
        log_info "Мониторинг системы (нажмите Ctrl+C для выхода):"
        while true; do
            clear
            echo "=== Quiz Game System Monitor ==="
            echo "Время: $(date)"
            echo ""
            
            COMPOSE_CMD=$(get_compose_cmd)
            COMPOSE_FILE=$(get_compose_file)
            $COMPOSE_CMD -f $COMPOSE_FILE ps
            echo ""
            
            docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
            echo ""
            
            # Проверка доступности сервисов
            if curl -f http://localhost:80 > /dev/null 2>&1; then
                echo -e "${GREEN}✓${NC} Frontend доступен"
            else
                echo -e "${RED}✗${NC} Frontend недоступен"
            fi
            
            if curl -f http://localhost:5001/health > /dev/null 2>&1; then
                echo -e "${GREEN}✓${NC} Backend доступен"
            else
                echo -e "${RED}✗${NC} Backend недоступен"
            fi
            
            sleep 5
        done
        ;;
    
    help|*)
        show_help
        ;;
esac

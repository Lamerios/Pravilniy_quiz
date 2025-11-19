#!/bin/bash

# Скрипт для настройки SSL сертификатов с помощью Let's Encrypt
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

# Проверка обязательных переменных
if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    log_error "Переменные DOMAIN и EMAIL должны быть настроены в config.env"
    exit 1
fi

log_info "Настройка SSL для домена: $DOMAIN"

# Проверка, что домен указывает на этот сервер
log_info "Проверка DNS записей для $DOMAIN..."
CURRENT_IP=$(curl -s ifconfig.me)
DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)

if [ "$CURRENT_IP" != "$DOMAIN_IP" ]; then
    log_warning "IP адрес домена ($DOMAIN_IP) не совпадает с текущим IP ($CURRENT_IP)"
    read -p "Продолжить? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Установка certbot если не установлен
if ! command -v certbot &> /dev/null; then
    log_info "Установка certbot..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y certbot
    elif command -v yum &> /dev/null; then
        sudo yum install -y certbot
    else
        log_error "Не удалось установить certbot. Установите его вручную."
        exit 1
    fi
fi

# Создание директории для SSL сертификатов
mkdir -p config/nginx/ssl

# Временная остановка frontend контейнера для освобождения порта 80
log_info "Временная остановка frontend для получения сертификата..."
docker-compose -f docker-compose.prod.yml stop frontend || true

# Получение SSL сертификата
log_info "Получение SSL сертификата от Let's Encrypt..."
sudo certbot certonly \
    --standalone \
    --preferred-challenges http \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

# Копирование сертификатов в проект
log_info "Копирование сертификатов..."
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem config/nginx/ssl/
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem config/nginx/ssl/
sudo chown $(whoami):$(whoami) config/nginx/ssl/*.pem

# Создание скрипта для обновления сертификатов
cat > scripts/deploy/renew-ssl.sh << 'EOF'
#!/bin/bash
set -e

log_info() { echo -e "\033[0;34m[INFO]\033[0m $1"; }
log_success() { echo -e "\033[0;32m[SUCCESS]\033[0m $1"; }
log_error() { echo -e "\033[0;31m[ERROR]\033[0m $1"; }

source config.env

log_info "Обновление SSL сертификата для $DOMAIN..."

# Остановка frontend
docker-compose -f docker-compose.prod.yml stop frontend

# Обновление сертификата
sudo certbot renew --standalone --preferred-challenges http

# Копирование обновленных сертификатов
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem config/nginx/ssl/
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem config/nginx/ssl/
sudo chown $(whoami):$(whoami) config/nginx/ssl/*.pem

# Запуск frontend
docker-compose -f docker-compose.prod.yml start frontend

log_success "SSL сертификат обновлен"
EOF

chmod +x scripts/deploy/renew-ssl.sh

# Добавление задания в crontab для автоматического обновления
log_info "Настройка автоматического обновления сертификата..."
(crontab -l 2>/dev/null; echo "0 2 * * 0 $PWD/scripts/deploy/renew-ssl.sh") | crontab -

# Перезапуск frontend с SSL
log_info "Перезапуск frontend с SSL поддержкой..."
docker-compose -f docker-compose.prod.yml up -d frontend

# Проверка SSL
log_info "Проверка SSL сертификата..."
sleep 10
if curl -f https://$DOMAIN/health > /dev/null 2>&1; then
    log_success "SSL настроен успешно! Сайт доступен по https://$DOMAIN"
else
    log_warning "Проверьте конфигурацию. Сайт может быть недоступен по HTTPS."
fi

# Обновление переменной окружения
if ! grep -q "SSL_CONFIGURED=true" config.env; then
    echo "SSL_CONFIGURED=true" >> config.env
fi

log_success "Настройка SSL завершена!"
log_info "Сертификат будет автоматически обновляться каждое воскресенье в 2:00"

# Руководство по развертыванию Quiz Game

## Обзор системы

Quiz Game - это полнофункциональное веб-приложение, состоящее из:
- **Frontend**: React приложение с nginx
- **Backend**: Node.js API сервер
- **Database**: PostgreSQL база данных
- **Monitoring**: Prometheus, Grafana, Loki (опционально)

## Требования к серверу

### Минимальные требования
- **CPU**: 2 ядра
- **RAM**: 4 GB
- **Disk**: 20 GB свободного места
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+

### Рекомендуемые требования
- **CPU**: 4 ядра
- **RAM**: 8 GB
- **Disk**: 50 GB SSD
- **Network**: Статический IP адрес

## Предварительная настройка сервера

### 1. Установка Docker и Docker Compose

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER

# CentOS/RHEL
sudo yum install -y docker docker-compose
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
```

### 2. Настройка файрвола

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Firewalld (CentOS)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 3. Настройка DNS

Убедитесь, что ваш домен указывает на IP адрес сервера:
```bash
# Проверка DNS записи
dig +short yourdomain.com
```

## Быстрый деплой

### 1. Подготовка файлов проекта

```bash
# Скопируйте файлы проекта на сервер, включая:
# - backend_v1.tar (готовый образ backend)
# - frontend_v1.tar (готовый образ frontend)
# - все конфигурационные файлы

cd quiz-game
```

### 2. Настройка переменных окружения

```bash
# Скопируйте и отредактируйте файл конфигурации
cp config.env config.env.local
nano config.env.local
```

**Обязательно измените следующие значения:**
- `DB_PASSWORD` - сложный пароль для базы данных
- `JWT_SECRET` - случайная строка минимум 64 символа
- `DOMAIN` - ваш домен
- `EMAIL` - ваш email для SSL сертификата

### 3. Загрузка готовых образов

```bash
# Загрузка готовых Docker образов
./manage.sh load-images
```

### 4. Запуск деплоя

```bash
# Полный автоматический деплой
./manage.sh deploy
```

### 5. Настройка SSL (опционально)

```bash
# Настройка HTTPS с Let's Encrypt
./manage.sh ssl-setup
```

## Ручной деплой

### 1. Загрузка готовых образов и запуск контейнеров

```bash
# Загрузка переменных окружения
source config.env.local

# Загрузка готовых Docker образов
./manage.sh load-images

# Запуск сервисов
docker-compose -f docker-compose.prod.yml up -d
```

### 2. Проверка состояния

```bash
# Статус контейнеров
docker-compose -f docker-compose.prod.yml ps

# Проверка логов
docker-compose -f docker-compose.prod.yml logs -f
```

### 3. Проверка доступности

```bash
# Проверка backend
curl http://localhost:5001/health

# Проверка frontend
curl http://localhost:80
```

## Управление системой

### Основные команды

```bash
# Запуск системы
./manage.sh start

# Остановка системы
./manage.sh stop

# Перезапуск системы
./manage.sh restart

# Просмотр статуса
./manage.sh status

# Просмотр логов
./manage.sh logs

# Мониторинг в реальном времени
./manage.sh monitor
```

### Бэкапы

```bash
# Создание бэкапа
./manage.sh backup

# Восстановление из бэкапа
./manage.sh restore /path/to/backup.sql.gz

# Просмотр доступных бэкапов
ls -la backups/
```

### Обновление системы

```bash
# Обновление кода и перезапуск
git pull origin main
./manage.sh update
```

## Мониторинг (опционально)

### Запуск системы мониторинга

```bash
# Запуск Prometheus, Grafana и Loki
docker-compose -f docker-compose.monitoring.yml up -d
```

### Доступ к интерфейсам мониторинга

- **Grafana**: http://your-server:3000 (admin/admin)
- **Prometheus**: http://your-server:9090
- **Alertmanager**: http://your-server:9093

## Безопасность

### Рекомендации по безопасности

1. **Смените все пароли по умолчанию**
2. **Используйте HTTPS в production**
3. **Регулярно обновляйте систему**
4. **Настройте файрвол**
5. **Включите автоматические бэкапы**

### Настройка автоматических бэкапов

```bash
# Добавление в crontab
crontab -e

# Добавьте строку для ежедневного бэкапа в 2:00
0 2 * * * /path/to/quiz-game/manage.sh backup
```

## Устранение неполадок

### Проверка логов

```bash
# Логи всех сервисов
./manage.sh logs

# Логи конкретного сервиса
./manage.sh logs backend
./manage.sh logs frontend
./manage.sh logs postgres
```

### Распространенные проблемы

#### 1. Контейнер не запускается

```bash
# Проверка причины
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs [service-name]

# Пересборка образа
docker-compose -f docker-compose.prod.yml build --no-cache [service-name]
```

#### 2. База данных недоступна

```bash
# Проверка состояния PostgreSQL
docker exec quiz-game-db-prod pg_isready -U quiz_user_prod

# Подключение к базе данных
docker exec -it quiz-game-db-prod psql -U quiz_user_prod -d quiz_game_prod
```

#### 3. SSL сертификат не работает

```bash
# Проверка сертификата
openssl x509 -in config/nginx/ssl/fullchain.pem -text -noout

# Обновление сертификата
./manage.sh ssl-renew
```

### Мониторинг ресурсов

```bash
# Использование ресурсов контейнерами
docker stats

# Место на диске
df -h

# Использование памяти
free -h

# Загрузка CPU
top
```

## Производительность

### Оптимизация производительности

1. **Настройка PostgreSQL**
   - Увеличьте `shared_buffers`
   - Настройте `work_mem`
   - Оптимизируйте `checkpoint_segments`

2. **Настройка nginx**
   - Включите gzip сжатие
   - Настройте кэширование статических файлов
   - Оптимизируйте `worker_processes`

3. **Мониторинг**
   - Используйте Grafana для отслеживания метрик
   - Настройте алерты для критических событий
   - Регулярно анализируйте логи

## Масштабирование

### Горизонтальное масштабирование

Для масштабирования системы на несколько серверов:

1. Используйте внешнюю базу данных (RDS, Cloud SQL)
2. Настройте load balancer (nginx, HAProxy)
3. Используйте Redis для сессий
4. Настройте CDN для статических файлов

### Вертикальное масштабирование

```bash
# Увеличение ресурсов для контейнеров
# Отредактируйте docker-compose.prod.yml:
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 4G
    reservations:
      cpus: '1.0'
      memory: 2G
```

## Поддержка

Для получения поддержки:
1. Проверьте логи системы
2. Изучите документацию
3. Создайте issue в репозитории
4. Обратитесь к администратору системы

# Quiz Game - Система викторин

Полнофункциональное веб-приложение для проведения викторин с React фронтендом и Node.js бэкендом.

## Особенности

- Регистрация и аутентификация пользователей
- Создание и управление викторинами
- Многопользовательская игра в реальном времени
- Отслеживание результатов и таблицы лидеров
- Панель администратора для управления контентом
- Загрузка изображений для вопросов
- WebSocket поддержка для реального времени

## Быстрый запуск (Production)

### Требования
- Docker и Docker Compose
- Минимум 4GB RAM
- 20GB свободного места на диске
- Ubuntu 20.04+ / CentOS 8+ / Debian 11+

### Запуск

```bash
# 1. Настройте переменные окружения
cp config.env config.env.local
nano config.env.local  # Измените пароли и домен

# 2. Загрузите готовые Docker образы
./manage.sh load-images

# 3. Запустите систему
./manage.sh deploy

# 4. (Опционально) Настройте HTTPS
./manage.sh ssl-setup
```

### Управление системой

```bash
./manage.sh start    # Запуск всех сервисов
./manage.sh stop     # Остановка всех сервисов
./manage.sh restart  # Перезапуск всех сервисов
./manage.sh status   # Статус контейнеров
./manage.sh logs     # Просмотр логов
./manage.sh backup   # Создание бэкапа
./manage.sh restore  # Восстановление из бэкапа
./manage.sh monitor  # Мониторинг в реальном времени
./manage.sh help     # Справка по командам
```

## Доступ к приложению

- **Основное приложение**: http://your-domain (или https:// если настроен SSL)
- **API**: http://your-domain/api
- **Health check**: http://your-domain/health

### Мониторинг (если включен)
- **Grafana**: http://your-domain:3000 (admin/admin)
- **Prometheus**: http://your-domain:9090
- **Alertmanager**: http://your-domain:9093

## Архитектура системы

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   PostgreSQL    │
│   (React +      │◄──►│   (Node.js +    │◄──►│   Database      │
│    Nginx)       │    │   Express)      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Network                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Prometheus  │  │   Grafana   │  │    Loki     │              │
│  │ (Metrics)   │  │(Dashboard)  │  │   (Logs)    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## Готовые образы

Система использует предварительно собранные Docker образы:
- `backend_v1.tar` - Backend сервер (Node.js + Express + Socket.IO)
- `frontend_v1.tar` - Frontend приложение (React + Nginx)

## Компоненты системы

### Frontend (React + Nginx)
- Современный React интерфейс
- Адаптивный дизайн
- WebSocket клиент для реального времени
- Nginx для статических файлов и проксирования API

### Backend (Node.js + Express)
- RESTful API
- WebSocket поддержка (Socket.IO)
- JWT аутентификация
- Загрузка файлов (Multer)
- Логирование (Winston)

### База данных (PostgreSQL)
- Надежное хранение данных
- Автоматическая инициализация схемы
- Регулярные бэкапы

## Безопасность

- HTTPS поддержка с Let's Encrypt
- JWT токены для аутентификации
- CORS защита
- Rate limiting
- Безопасные заголовки HTTP
- Изолированные Docker контейнеры

## Мониторинг и логирование

- **Prometheus** - сбор метрик
- **Grafana** - визуализация данных
- **Loki** - централизованное логирование
- **Alertmanager** - уведомления о проблемах

## Документация

- [DEPLOY.md](DEPLOY.md) - Подробное руководство по развертыванию
- [SETUP.md](SETUP.md) - Настройка среды разработки
- [config.env](config.env) - Пример конфигурации

## Устранение неполадок

### Проверка статуса системы
```bash
./manage.sh status
```

### Просмотр логов
```bash
# Все сервисы
./manage.sh logs

# Конкретный сервис
./manage.sh logs backend
./manage.sh logs frontend
./manage.sh logs postgres
```

### Перезапуск проблемного сервиса
```bash
docker-compose -f docker-compose.prod.yml restart backend
```

### Проверка доступности сервисов
```bash
curl http://localhost/health      # Frontend
curl http://localhost:5001/health # Backend (если доступен)
```

## Поддержка

При возникновении проблем:
1. Проверьте статус: `./manage.sh status`
2. Посмотрите логи: `./manage.sh logs`
3. Изучите документацию в [DEPLOY.md](DEPLOY.md)
4. Проверьте конфигурацию в `config.env`
5. Убедитесь, что все порты доступны и файрвол настроен правильно
#!/usr/bin/env node

/**
 * Project Setup Script
 * Автоматическая настройка проекта с нуля
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Настройка системы управления квизами\n');
console.log('📋 Система для организаторов интеллектуальных игр\n');

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`)
};

// 1. Создаем необходимые директории
log.info('Создаем директории...');
const dirs = ['uploads', 'logs'];
dirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    log.success(`Создана директория: ${dir}`);
  } else {
    log.info(`Директория уже существует: ${dir}`);
  }
});

// 2. Копируем конфигурационные файлы
log.info('\nКопируем конфигурационные файлы...');

// Backend .env
const backendEnvSource = path.join(__dirname, 'config', 'backend.env');
const backendEnvTarget = path.join(__dirname, 'backend', '.env');
if (!fs.existsSync(backendEnvTarget)) {
  if (fs.existsSync(backendEnvSource)) {
    fs.copyFileSync(backendEnvSource, backendEnvTarget);
    log.success('Создан backend/.env');
  } else {
    log.error('Не найден config/backend.env');
  }
} else {
  log.warning('backend/.env уже существует - пропускаем');
}

// Frontend .env
const frontendEnvSource = path.join(__dirname, 'config', 'frontend.env');
const frontendEnvTarget = path.join(__dirname, 'frontend', '.env');
if (!fs.existsSync(frontendEnvTarget)) {
  if (fs.existsSync(frontendEnvSource)) {
    fs.copyFileSync(frontendEnvSource, frontendEnvTarget);
    log.success('Создан frontend/.env');
  } else {
    log.error('Не найден config/frontend.env');
  }
} else {
  log.warning('frontend/.env уже существует - пропускаем');
}

// 3. Проверяем package.json файлы
log.info('\nПроверяем зависимости...');

const checkPackageJson = (dir) => {
  const packagePath = path.join(__dirname, dir, 'package.json');
  if (fs.existsSync(packagePath)) {
    log.success(`${dir}/package.json найден`);
    return true;
  } else {
    log.error(`${dir}/package.json не найден`);
    return false;
  }
};

const hasBackendPackage = checkPackageJson('backend');
const hasFrontendPackage = checkPackageJson('frontend');

// 4. Инструкции для установки
console.log('\n' + '='.repeat(50));
console.log('📋 СЛЕДУЮЩИЕ ШАГИ:');
console.log('='.repeat(50) + '\n');

console.log('1. Настройка базы данных:');
console.log('   - Запустите PostgreSQL');
console.log('   - Выполните: psql -U postgres -f config/database.sql');
console.log('   - Или используйте Docker: docker compose up -d\n');

if (hasBackendPackage) {
  console.log('2. Запуск Backend:');
  console.log('   cd backend');
  console.log('   npm install');
  console.log('   npm run db:seed');
  console.log('   npm run dev\n');
}

if (hasFrontendPackage) {
  console.log('3. Запуск Frontend:');
  console.log('   cd frontend');
  console.log('   npm install');
  console.log('   npm start\n');
}

console.log('4. Проверка:');
console.log('   - Backend API: http://localhost:5001/health');
console.log('   - Frontend: http://localhost:3000');
console.log('   - API Docs: http://localhost:5001/api-docs (если настроено)\n');

// 5. Создаем скрипт быстрого запуска
const startScript = `#!/bin/bash
# Скрипт быстрого запуска проекта

echo "Starting Quiz Game Project..."

# Start backend
cd backend
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start frontend
cd ../frontend
npm start &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
wait
`;

const startScriptPath = path.join(__dirname, 'start.sh');
fs.writeFileSync(startScriptPath, startScript);
log.success('Создан скрипт start.sh для быстрого запуска');

// 6. Создаем Windows batch файл
const startBatch = `@echo off
echo Starting Quiz Game Project...

start "Backend" cmd /k "cd backend && npm run dev"
timeout /t 5
start "Frontend" cmd /k "cd frontend && npm start"

echo.
echo Backend and Frontend started in separate windows
echo Close windows to stop services
pause
`;

const startBatchPath = path.join(__dirname, 'start.bat');
fs.writeFileSync(startBatchPath, startBatch);
log.success('Создан скрипт start.bat для Windows');

console.log('\n' + '='.repeat(50));
log.success('Настройка завершена!');
console.log('='.repeat(50));

// 7. Проверка текущих .env файлов
log.info('\nПроверка конфигурации:');
if (fs.existsSync(backendEnvTarget)) {
  const envContent = fs.readFileSync(backendEnvTarget, 'utf8');
  if (envContent.includes('DB_HOST') && envContent.includes('DB_PORT')) {
    log.success('backend/.env настроен');
  } else {
    log.warning('backend/.env требует настройки');
  }
}

if (fs.existsSync(frontendEnvTarget)) {
  const envContent = fs.readFileSync(frontendEnvTarget, 'utf8');
  if (envContent.includes('REACT_APP_API_URL')) {
    log.success('frontend/.env настроен');
  } else {
    log.warning('frontend/.env требует настройки');
  }
}

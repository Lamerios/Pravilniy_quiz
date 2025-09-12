#!/usr/bin/env node

/**
 * Configuration checker script
 * Validates all environment variables and configuration
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking project configuration...\n');

// Check backend .env
const backendEnvPath = path.join(__dirname, '../backend/.env');
if (!fs.existsSync(backendEnvPath)) {
  console.error('❌ Backend .env file not found!');
  console.log('   Create backend/.env with:');
  console.log(`
NODE_ENV=development
DB_HOST=127.0.0.1
DB_PORT=5433
DB_NAME=quiz_game_dev2
DB_USER=quiz_user
DB_PASSWORD=quiz123
BACKEND_PORT=5001
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=24h
ADMIN_PASSWORD=admin_password
UPLOAD_PATH=../uploads
MAX_FILE_SIZE=5242880
LOG_LEVEL=info
LOG_PATH=../logs
  `);
} else {
  console.log('✅ Backend .env found');
  const envContent = fs.readFileSync(backendEnvPath, 'utf8');
  const requiredVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'BACKEND_PORT'];
  requiredVars.forEach(varName => {
    if (!envContent.includes(varName)) {
      console.error(`   ❌ Missing ${varName}`);
    } else {
      console.log(`   ✅ ${varName} configured`);
    }
  });
}

// Check frontend .env
const frontendEnvPath = path.join(__dirname, '../frontend/.env');
if (!fs.existsSync(frontendEnvPath)) {
  console.error('\n❌ Frontend .env file not found!');
  console.log('   Create frontend/.env with:');
  console.log(`
REACT_APP_API_URL=http://localhost:5001
REACT_APP_WS_URL=ws://localhost:5001
  `);
} else {
  console.log('\n✅ Frontend .env found');
}

// Check database connection
console.log('\n🔍 Checking database connection...');
const { Client } = require('pg');
require('dotenv').config({ path: backendEnvPath });

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

client.connect()
  .then(() => {
    console.log('✅ Database connection successful');
    return client.query('SELECT COUNT(*) FROM teams');
  })
  .then(result => {
    console.log(`✅ Teams table exists with ${result.rows[0].count} records`);
    client.end();
  })
  .catch(err => {
    console.error('❌ Database error:', err.message);
    client.end();
  });

// Check file structure
console.log('\n🔍 Checking file structure...');
const requiredDirs = [
  'backend/src',
  'backend/dist',
  'frontend/src',
  'frontend/public',
  'uploads',
  'logs',
];

requiredDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${dir} exists`);
  } else {
    console.log(`❌ ${dir} missing - creating...`);
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

console.log('\n✨ Configuration check complete!');


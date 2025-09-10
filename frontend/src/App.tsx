/**
 * Main React application component
 * Handles routing and global state
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Import components
import AdminPanel from './components/admin/AdminPanel';
// import Scoreboard from './components/scoreboard/Scoreboard';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Quiz Game System</h1>
        </header>
        
        <main>
          <Routes>
            {/* Default route - redirect to admin for now */}
            <Route path="/" element={<Navigate to="/admin" replace />} />
            
            {/* Admin panel routes */}
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/admin/*" element={<AdminPanel />} />
            
            {/* Public scoreboard routes */}
            <Route path="/board/:gameId" element={<ScoreboardPlaceholder />} />
            
            {/* 404 fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

// Placeholder components for initial setup
const AdminPlaceholder: React.FC = () => (
  <div style={{ padding: '20px', textAlign: 'center' }}>
    <h2>Admin Panel</h2>
    <p>Административная панель будет реализована в следующих итерациях</p>
    <div style={{ marginTop: '20px', color: '#666' }}>
      <p>Планируемые разделы:</p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        <li>📋 Управление шаблонами игр</li>
        <li>👥 Управление командами</li>
        <li>🎮 Создание и проведение игр</li>
      </ul>
    </div>
  </div>
);

const ScoreboardPlaceholder: React.FC = () => (
  <div style={{ padding: '20px', textAlign: 'center' }}>
    <h2>Публичное табло</h2>
    <p>Табло результатов будет реализовано в следующих итерациях</p>
    <div style={{ marginTop: '20px', color: '#666' }}>
      <p>Планируемые функции:</p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        <li>📊 Текущие результаты команд</li>
        <li>⚡ Обновление в реальном времени</li>
        <li>🏆 Рейтинг команд</li>
      </ul>
    </div>
  </div>
);

const NotFound: React.FC = () => (
  <div style={{ padding: '20px', textAlign: 'center' }}>
    <h2>404 - Страница не найдена</h2>
    <p>Запрашиваемая страница не существует</p>
  </div>
);

export default App;

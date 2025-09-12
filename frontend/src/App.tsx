/**
 * Main React application component
 * Handles routing and global state
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Import components
import AdminPanel from './components/admin/AdminPanel.tsx';
import Scoreboard from './components/scoreboard/Scoreboard.tsx';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Правильный Квиз</h1>
        </header>
        
        <main>
          <Routes>
            {/* Default route - redirect to admin for now */}
            <Route path="/" element={<Navigate to="/admin" replace />} />
            
            {/* Admin panel routes */}
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/admin/*" element={<AdminPanel />} />
            
            {/* Public scoreboard routes */}
            <Route path="/board/:gameId" element={<Scoreboard />} />
            
            {/* 404 fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

const NotFound: React.FC = () => (
  <div style={{ padding: '20px', textAlign: 'center' }}>
    <h2>404 - Страница не найдена</h2>
    <p>Запрашиваемая страница не существует</p>
  </div>
);

export default App;

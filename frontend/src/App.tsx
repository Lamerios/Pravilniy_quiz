/**
 * Main React application component
 * Handles routing and global state
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import './App.css';

// Import components
import AdminPanel from 'components/admin/AdminPanel';
import Scoreboard from 'components/scoreboard/Scoreboard';
import Home from 'components/home/Home';
import TeamProfile from 'components/team/TeamProfile';
import Showcase from 'components/Showcase';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h1 style={{ cursor: 'pointer', transition: 'opacity 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>Правильный Квиз</h1>
          </Link>
        </header>
        
        <main style={{ flex: 1 }}>
          <Routes>
            {/* Public Home */}
            <Route path="/" element={<Home />} />
            <Route path="/demo" element={<Showcase />} />
            
            {/* Admin panel routes */}
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/admin/*" element={<AdminPanel />} />
            
            {/* Public scoreboard routes */}
            <Route path="/board/:gameId" element={<Scoreboard />} />
            <Route path="/team/:teamId" element={<TeamProfile />} />
            
            {/* 404 fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        
        <footer className="App-footer">
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--gray-600)', padding: 'var(--space-md)' }}>
            Разработано{' '}
            <a 
              href="https://t.me/lamerios" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: 'var(--purple-600)', textDecoration: 'none' }}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
            >
              Lamerios
            </a>
            {' '}с любовью к жителям Испанских кварталов
          </div>
        </footer>
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

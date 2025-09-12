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
import Home from './components/home/Home.tsx';
import TeamProfile from './components/team/TeamProfile.tsx';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Правильный Квиз</h1>
        </header>
        
        <main>
          <Routes>
            {/* Public Home */}
            <Route path="/" element={<Home />} />
            
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

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import VitalsPage from './pages/VitalsPage';
import AccountsPage from './pages/AccountsPage';
import AlertsPage from './pages/AlertsPage';
import { fetchStats } from './api/equityApi';

export default function App() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(err => console.error('Failed to load stats:', err));
  }, []);

  return (
    <BrowserRouter>
      <div className="flex min-h-screen">
        <Sidebar />
        <Header stats={stats} />
        <main className="flex-1 ml-[260px] pt-[64px] min-h-screen">
          <Routes>
            <Route path="/" element={<VitalsPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

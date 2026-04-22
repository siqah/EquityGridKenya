import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SyntheticDataProvider } from './context/SyntheticDataContext';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import VitalsPage from './pages/VitalsPage';
import AccountsPage from './pages/AccountsPage';
import AlertsPage from './pages/AlertsPage';
import PolicySimulatorPage from './pages/PolicySimulatorPage';
import AccountLookupPage from './pages/AccountLookupPage';
import MethodologyPage from './pages/MethodologyPage';
import HouseholdReportPage from './pages/HouseholdReportPage';

function AppShell() {
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface-muted">
      <Sidebar mobileOpen={mobileNav} onClose={() => setMobileNav(false)} />
      <Header onMenu={() => setMobileNav(true)} />
      <main className="flex-1 pt-16 min-h-screen lg:ml-[260px] w-full min-w-0">
        <Routes>
          <Route path="/" element={<VitalsPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/simulator" element={<PolicySimulatorPage />} />
          <Route path="/lookup" element={<AccountLookupPage />} />
          <Route path="/methodology" element={<MethodologyPage />} />
          <Route path="/my-energy-report" element={<HouseholdReportPage />} />
          <Route path="/household/:accountHash" element={<HouseholdReportPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <SyntheticDataProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </SyntheticDataProvider>
  );
}

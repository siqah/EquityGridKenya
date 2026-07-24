import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SyntheticDataProvider } from './context/SyntheticDataContext';
import { DashboardModeProvider } from './context/DashboardModeContext';
import { NajiProvider } from './context/NajiContext';
import HouseholdEntryModal from './components/Household/HouseholdEntryModal';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import { useSyntheticData } from './context/SyntheticDataContext';

const VitalsPage = lazy(() => import('./pages/VitalsPage'));
const AccountsPage = lazy(() => import('./pages/AccountsPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const PolicySimulatorPage = lazy(() => import('./pages/PolicySimulatorPage'));
const AccountLookupPage = lazy(() => import('./pages/AccountLookupPage'));
const MethodologyPage = lazy(() => import('./pages/MethodologyPage'));
const HouseholdReportPage = lazy(() => import('./pages/HouseholdReportPage'));
const HouseholdDashboardPage = lazy(() => import('./pages/HouseholdDashboardPage'));

function RouteLoadingState() {
  return (
    <div className="p-5 md:p-8 max-w-[1440px] mx-auto" role="status" aria-live="polite">
      <span className="sr-only">Loading page</span>
      <div className="h-3 w-28 rounded bg-slate-200 animate-pulse" />
      <div className="mt-3 h-8 w-72 max-w-full rounded bg-slate-200 animate-pulse" />
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-32 rounded-xl border border-border bg-surface p-5">
            <div className="h-3 w-20 rounded bg-slate-100 animate-pulse" />
            <div className="mt-4 h-6 w-32 rounded bg-slate-100 animate-pulse" />
            <div className="mt-5 h-3 w-full rounded bg-slate-100 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CohortErrorState({ error, onRetry }) {
  return (
    <section className="p-5 md:p-8 max-w-xl mx-auto" role="alert">
      <div className="card p-6 md:p-8 text-center">
        <p className="text-sm font-semibold text-tier-red">Cohort unavailable</p>
        <h2 className="mt-2 text-xl font-bold tracking-[-0.02em] text-body">We could not load the household register.</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{error} Check your connection, then try loading the cohort again.</p>
        <button type="button" onClick={onRetry} className="mt-5 min-h-10 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90">
          Try again
        </button>
      </div>
    </section>
  );
}

function AppShell() {
  const [mobileNav, setMobileNav] = useState(false);
  const { loading, error, refresh } = useSyntheticData();

  return (
    <div className="flex min-h-screen bg-surface-muted">
      <Sidebar mobileOpen={mobileNav} onClose={() => setMobileNav(false)} />
      <Header onMenu={() => setMobileNav(true)} />
      <main className="flex-1 pt-16 min-h-screen lg:ml-[260px] w-full min-w-0">
        <Suspense fallback={<RouteLoadingState />}>
          {loading ? (
            <RouteLoadingState />
          ) : error ? (
            <CohortErrorState error={error} onRetry={refresh} />
          ) : (
            <Routes>
              <Route path="/" element={<VitalsPage />} />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/simulator" element={<PolicySimulatorPage />} />
              <Route path="/lookup" element={<AccountLookupPage />} />
              <Route path="/methodology" element={<MethodologyPage />} />
              <Route path="/my-account" element={<HouseholdDashboardPage />} />
              <Route path="/my-energy-report" element={<HouseholdReportPage />} />
              <Route path="/household/:accountHash" element={<HouseholdReportPage />} />
            </Routes>
          )}
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <SyntheticDataProvider>
      <BrowserRouter>
        <DashboardModeProvider>
          <NajiProvider>
            <HouseholdEntryModal />
            <AppShell />
          </NajiProvider>
        </DashboardModeProvider>
      </BrowserRouter>
    </SyntheticDataProvider>
  );
}

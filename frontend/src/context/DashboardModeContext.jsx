import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const DashboardModeContext = createContext(null);

export function DashboardModeProvider({ children }) {
  const [mode, setMode] = useState('regulator');
  const [householdAccountHash, setHouseholdAccountHash] = useState(null);

  const setHouseholdAccount = useCallback((hash) => {
    setHouseholdAccountHash(hash ? String(hash).trim().toUpperCase() : null);
  }, []);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      householdAccountHash,
      setHouseholdAccount,
      isHousehold: mode === 'household',
    }),
    [mode, householdAccountHash, setHouseholdAccount],
  );

  return <DashboardModeContext.Provider value={value}>{children}</DashboardModeContext.Provider>;
}

export function useDashboardMode() {
  const ctx = useContext(DashboardModeContext);
  if (!ctx) throw new Error('useDashboardMode must be used within DashboardModeProvider');
  return ctx;
}

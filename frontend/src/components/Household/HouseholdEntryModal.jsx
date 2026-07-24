import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardMode } from '../../context/DashboardModeContext';

export default function HouseholdEntryModal() {
  const { isHousehold, householdAccountHash, setHouseholdAccount, setMode } = useDashboardMode();
  const navigate = useNavigate();
  const [value, setValue] = useState('');

  if (!isHousehold || householdAccountHash) return null;

  const submit = (e) => {
    e.preventDefault();
    let s = value.trim().toUpperCase().replace(/\s+/g, '_');
    if (!s) return;
    if (!s.startsWith('ACC')) {
      const digits = s.replace(/\D/g, '');
      if (!digits) return;
      s = `ACC_${digits}`;
    } else if (!s.startsWith('ACC_')) {
      s = `ACC_${s.replace(/^ACC_?/, '')}`;
    }
    setHouseholdAccount(s);
    navigate('/my-account');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl p-8 space-y-6 animate-fade-in">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-xl bg-primary text-white flex items-center justify-center text-xl font-bold shadow-md">
            EG
          </div>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-slate-900">Enter your account number</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Find your account number on your KPLC bill or token receipt
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="sr-only" htmlFor="household-acct">
              Account number
            </label>
            <input
              id="household-acct"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. ACC_168669"
              autoComplete="off"
              className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/35"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-sm hover:bg-blue-700"
          >
            View My Report
          </button>
        </form>
        <p className="text-center text-xs text-slate-500">
          Don&apos;t have your number?{' '}
          <a href="tel:0703070707" className="text-blue-600 font-semibold hover:underline">
            Contact KPLC 0703 070 707
          </a>
        </p>
        <button
          type="button"
          onClick={() => setMode('regulator')}
          className="w-full text-center text-xs text-slate-500 hover:text-slate-800 underline"
        >
          Back to regulator view
        </button>
      </div>
    </div>
  );
}

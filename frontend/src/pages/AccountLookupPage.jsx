import { useMemo, useState } from 'react';
import PageFade from '../components/Layout/PageFade';
import { useSyntheticData } from '../context/SyntheticDataContext';
import { LOOKUP_SIGNAL_GROUPS } from '../constants/signalLabels';

function scoreBarColor(score) {
  if (score <= 40) return 'bg-tier-green';
  if (score <= 70) return 'bg-tier-yellow';
  return 'bg-tier-red';
}

function personaFor(account) {
  if (account.classification === 'GREEN') {
    return { label: 'GREEN — Lifeline eligible', tone: 'text-tier-green' };
  }
  if (account.classification === 'YELLOW') {
    return { label: 'YELLOW — Standard tariff', tone: 'text-tier-yellow' };
  }
  return { label: 'RED — Cross-subsidy contributor', tone: 'text-tier-red' };
}

function staticExplanation(account) {
  return `Although this account is recorded in ${account.county}, the usage and liquidity pattern (${account.kwh_month} kWh/month, peak ${account.peak_kw} kW, average token KSh ${account.token_avg_ksh}) ${account.classification === 'RED' ? 'aligns with higher-than-expected capacity for the vulnerability band' : 'aligns with constrained purchasing and baseload consistent with lifeline protection'}. Flags such as ${(account.flags || []).join(', ') || 'none'} are interpreted alongside county poverty index ${account.poverty_index} to keep decisions reviewable by regulators.`;
}

function perCapitaBox(account) {
  const ward = account.ward || account.county;
  const hh = account.classification === 'RED' ? 3.1 : account.classification === 'YELLOW' ? 4.2 : 5.4;
  const perCap = account.kwh_month / hh;
  const benchmark = 55;
  const above = perCap > benchmark;
  return (
    <div className="card p-4 border-border bg-surface-muted/60">
      <div className="text-sm font-bold text-primary mb-2">Per capita analysis</div>
      <ul className="text-sm text-body space-y-2">
        <li>
          <span className="text-muted">Ward / area:</span> <span className="font-semibold">{ward}</span>
        </li>
        <li>
          <span className="text-muted">Modelled household size:</span>{' '}
          <span className="font-semibold">{hh.toFixed(1)}</span> people
        </li>
        <li>
          <span className="text-muted">Effective kWh per person:</span>{' '}
          <span className="font-semibold">{perCap.toFixed(1)} kWh</span>
        </li>
        <li>
          <span className="text-muted">National benchmark:</span>{' '}
          <span className="font-semibold">{benchmark} kWh</span> / person (illustrative)
        </li>
        <li>
          <span className="text-muted">Verdict:</span>{' '}
          <span className={`font-semibold ${above ? 'text-tier-red' : 'text-tier-green'}`}>
            {above ? 'Above benchmark — review for luxury baseload' : 'At or below benchmark — consistent with vulnerability'}
          </span>
        </li>
      </ul>
    </div>
  );
}

export default function AccountLookupPage() {
  const { accounts } = useSyntheticData();
  const [query, setQuery] = useState('ACC_168669');

  const account = useMemo(() => {
    const q = query.trim().toUpperCase();
    return accounts.find((a) => a.account_hash.toUpperCase() === q) || null;
  }, [accounts, query]);

  const persona = account ? personaFor(account) : null;

  return (
    <PageFade className="p-5 md:p-8 max-w-[1100px] mx-auto space-y-5">
      <div className="card p-4 flex flex-col md:flex-row gap-3 md:items-end">
        <div className="flex-1">
          <label className="text-xs font-semibold text-muted uppercase tracking-wide" htmlFor="acct">
            Account ID
          </label>
          <input
            id="acct"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter Account ID e.g. ACC_168669"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm font-mono text-body focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button
          type="button"
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold"
          onClick={() => setQuery('ACC_168669')}
        >
          Reset demo (ACC_168669)
        </button>
      </div>

      {!account && (
        <div className="card p-8 text-center text-sm text-muted">
          No account found for <span className="font-mono font-semibold text-body">{query.trim() || '—'}</span>. Try{' '}
          <button type="button" className="text-primary font-semibold underline" onClick={() => setQuery('ACC_004521')}>
            ACC_004521
          </button>{' '}
          or{' '}
          <button type="button" className="text-primary font-semibold underline" onClick={() => setQuery('ACC_772301')}>
            ACC_772301
          </button>
          .
        </div>
      )}

      {account && (
        <div className="space-y-5 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {LOOKUP_SIGNAL_GROUPS.map((g) => {
              const score = Math.min(100, Math.max(0, g.score(account)));
              return (
                <div key={g.key} className="card p-4 flex flex-col gap-2">
                  <div className="text-2xl" aria-hidden>
                    {g.icon}
                  </div>
                  <div className="text-sm font-bold text-primary">{g.title}</div>
                  <div className="text-3xl font-extrabold text-body">{score}</div>
                  <div className="text-xs text-muted leading-snug">{g.summary(account)}</div>
                </div>
              );
            })}
          </div>

          <div className="card p-4">
            <div className="flex justify-between text-sm font-semibold text-body mb-2">
              <span>Equity score</span>
              <span className="font-mono">{account.score}</span>
            </div>
            <div className="h-4 rounded-full bg-surface-muted border border-border overflow-hidden flex">
              <div
                className={`h-full ${scoreBarColor(account.score)}`}
                style={{ width: `${Math.min(100, account.score)}%` }}
              />
            </div>
            <div className="mt-3">
              <div className={`inline-flex px-3 py-1 rounded-full text-xs font-extrabold border border-border ${persona.tone}`}>
                {persona.label} · {account.tariff}×
              </div>
            </div>
          </div>

          <div className="card p-4 bg-surface-muted border-dashed">
            <p className="text-sm italic text-muted leading-relaxed">{staticExplanation(account)}</p>
            <p className="text-xs text-muted mt-3">
              Live LLM explainability (Claude / GPT) would call out this same structure with tighter prose — here we ship a deterministic narrative for demo reliability.
            </p>
          </div>

          {perCapitaBox(account)}
        </div>
      )}
    </PageFade>
  );
}

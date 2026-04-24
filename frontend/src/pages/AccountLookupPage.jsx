import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import NajiFloatingWidget from '../components/Naji/NajiFloatingWidget';
import PageFade from '../components/Layout/PageFade';
import { useSyntheticData } from '../context/SyntheticDataContext';
import { LOOKUP_CARDS, tierBarClass, buildExplanationPrompt } from '../constants/signalLabels';

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
  const kpp = account.kwh_per_person ?? account.kwh_month / Math.max(account.ward_avg_household_size, 0.5);
  const disc = account.avg_disconnection_days_per_month;
  const peakPct = Math.round((account.peak_demand_ratio ?? 0) * 100);
  const nsps = account.nsps_registered ? 'is recorded on the national social protection register' : 'is not on that register';
  const phase = account.has_three_phase ? 'uses a three-phase service connection' : 'uses a standard single-phase connection';
  const meters = account.accounts_same_address;
  return `This household in ${account.county} ${nsps}, ${phase}, and has about ${kpp.toFixed(1)} kWh per person each month with roughly ${disc} disconnection days and about ${peakPct}% of energy in the evening peak; ${meters === 1 ? 'only one meter is linked to the address' : `${meters} meters are linked to the same address`}. Taken together, that picture ${account.classification === 'RED' ? 'points to stronger capacity than a lifeline household and supports a contributor classification' : account.classification === 'GREEN' ? 'is consistent with constrained circumstances and supports a protected lifeline classification' : 'sits between those extremes and supports standard retail terms'}.`;
}

function contextCard(account) {
  const kpp = account.kwh_per_person ?? account.kwh_month / Math.max(account.ward_avg_household_size, 0.5);
  return (
    <div className="card p-4 border-border bg-surface-muted/60">
      <div className="text-sm font-bold text-primary mb-2">Household context</div>
      <ul className="text-sm text-body space-y-2">
        <li>
          <span className="text-muted">Urban / rural:</span>{' '}
          <span className="font-semibold">{account.urban_rural_classification}</span>
        </li>
        {account.ward && (
          <li>
            <span className="text-muted">Ward / area label:</span>{' '}
            <span className="font-semibold">{account.ward}</span>
          </li>
        )}
        <li>
          <span className="text-muted">Ward avg. household size (model input):</span>{' '}
          <span className="font-semibold">{account.ward_avg_household_size}</span>
        </li>
        <li>
          <span className="text-muted">kWh per person (derived):</span>{' '}
          <span className="font-semibold">{kpp.toFixed(1)}</span>{' '}
          <span className="text-muted">(benchmark 22)</span>
        </li>
      </ul>
    </div>
  );
}

export default function AccountLookupPage() {
  const { accounts } = useSyntheticData();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('ACC_168669');

  useEffect(() => {
    const a = searchParams.get('account');
    if (a && a.trim()) setQuery(a.trim());
  }, [searchParams]);

  const account = useMemo(() => {
    const q = query.trim().toUpperCase();
    return accounts.find((a) => a.account_hash.toUpperCase() === q) || null;
  }, [accounts, query]);

  const persona = account ? personaFor(account) : null;
  const llmPrompt = account ? buildExplanationPrompt({
    ...account,
    final_score: account.final_score,
    avg_disconnection_days_per_month: account.avg_disconnection_days_per_month,
    peak_demand_ratio: account.peak_demand_ratio,
  }) : '';

  return (
    <>
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
        <div className="flex flex-wrap gap-2 items-end">
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold"
            onClick={() => setQuery('ACC_168669')}
          >
            Reset demo (ACC_168669)
          </button>
        </div>
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
          <div className="flex justify-end">
            <Link
              to={`/household/${encodeURIComponent(account.account_hash)}`}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-sm"
            >
              View Household Report
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {LOOKUP_CARDS.map((g) => {
              const score = Math.min(100, Math.max(0, g.score(account)));
              return (
                <div key={g.key} className="card p-4 flex flex-col gap-2">
                  <div className="text-2xl" aria-hidden>
                    {g.icon}
                  </div>
                  <div className="text-sm font-bold text-primary">{g.title}</div>
                  <div className="text-3xl font-extrabold text-body">{score}</div>
                  <div className="text-xs text-muted leading-snug">{g.line(account)}</div>
                  <div className="h-2 rounded-full bg-surface-muted border border-border overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full transition-all ${tierBarClass(score)}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card p-4">
            <div className="flex justify-between text-sm font-semibold text-body mb-2">
              <span>Equity score</span>
              <span className="font-mono">{account.final_score}</span>
            </div>
            <div className="h-4 rounded-full bg-surface-muted border border-border overflow-hidden flex">
              <div
                className={`h-full ${tierBarClass(account.final_score)}`}
                style={{ width: `${Math.min(100, account.final_score)}%` }}
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
              Live LLM explainability (Claude / GPT) would use the same facts with tighter prose — here we ship a deterministic narrative for demo reliability.
            </p>
            <details className="mt-4 text-xs">
              <summary className="cursor-pointer font-semibold text-primary">Prompt sent to the AI API</summary>
              <pre className="mt-2 p-3 rounded-lg bg-surface border border-border overflow-x-auto whitespace-pre-wrap text-[11px] text-body leading-relaxed">
                {llmPrompt}
              </pre>
            </details>
          </div>

          {contextCard(account)}
        </div>
      )}
    </PageFade>
    <NajiFloatingWidget />
    </>
  );
}

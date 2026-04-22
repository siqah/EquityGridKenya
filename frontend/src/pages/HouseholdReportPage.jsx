import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import PageFade from '../components/Layout/PageFade';
import { useSyntheticData } from '../context/SyntheticDataContext';
import { tierBarClass } from '../constants/signalLabels';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from 'recharts';

const SCORE_GREEN_MAX = 40;
const SCORE_YELLOW_MAX = 70;

function hashSeed(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

/** Illustrative appliance split from peak ratio + capacity (demo-only). */
function applianceBreakdown(account) {
  const peak = account.peak_demand_ratio ?? 0.5;
  const heavy = account.has_three_phase ? 0.22 + peak * 0.15 : peak * 0.18;
  const cooking = 0.12 + (1 - peak) * 0.1;
  const water = 0.08 + peak * 0.12;
  const ent = 0.1 + (1 - peak) * 0.08;
  const light = Math.max(0.05, 0.28 - heavy * 0.3);
  const standby = Math.max(0.04, 1 - heavy - cooking - water - ent - light);
  const raw = [
    { name: 'Lighting', v: light },
    { name: 'Entertainment (TV, devices)', v: ent },
    { name: 'Cooking appliances', v: cooking },
    { name: 'Water heating / pumping', v: water },
    { name: 'Heavy appliances (AC, iron, workshop)', v: heavy },
    { name: 'Other / standby', v: standby },
  ];
  const t = raw.reduce((s, x) => s + x.v, 0);
  return raw.map((x) => ({ name: x.name, value: Math.round((x.v / t) * 1000) / 10 }));
}

function monthlySeries(account) {
  const base = account.kwh_month;
  const seed = hashSeed(account.account_hash);
  const months = ['M-5', 'M-4', 'M-3', 'M-2', 'M-1', 'This month'];
  return months.map((m, i) => {
    const wobble = ((seed >> (i * 4)) % 13) / 100 - 0.06;
    const kwh = Math.max(8, Math.round(base * (0.78 + i * 0.035 + wobble)));
    return { month: m, kwh };
  });
}

function coachingCards(account) {
  const peak = account.peak_demand_ratio ?? 0.5;
  const tier = account.classification;
  const tierNote =
    tier === 'GREEN' ? 'helps keep you in Green tier' : tier === 'YELLOW' ? 'reduces risk of moving to Red' : 'can soften your next bill';
  return [
    {
      title: 'Shift water pump to off-peak (10pm–5am)',
      ksh: 280 + Math.round(peak * 120),
      kwh: 12 + Math.round(peak * 10),
      tier: tierNote,
      how: 'Run the pump after most neighbours have turned off large loads.',
    },
    {
      title: 'Replace remaining incandescent bulbs with LEDs',
      ksh: 60 + (account.kwh_month > 200 ? 40 : 0),
      kwh: 6 + Math.round((1 - peak) * 4),
      tier: tierNote,
      how: 'LEDs cut evening peak draw where your usage is concentrated.',
    },
    {
      title: 'Unplug entertainment stack on standby overnight',
      ksh: 35,
      kwh: 4,
      tier: 'small but steady savings',
      how: 'Power strips make one-switch cut-off easy before bed.',
    },
  ];
}

function aiMessage(account) {
  const peakPct = Math.round((account.peak_demand_ratio ?? 0) * 100);
  const kpp = account.kwh_per_person ?? account.kwh_month / Math.max(account.ward_avg_household_size, 0.5);
  return `Based on your usage pattern, your biggest opportunity is evening demand — about ${peakPct}% of your units land between 7pm and 9pm. Shifting heavier tasks like ironing or pumping to after 10pm could trim roughly KSh 350–450 from a typical month and keep your bill ${account.classification === 'GREEN' ? 'comfortably inside the subsidised band' : account.classification === 'YELLOW' ? 'from creeping toward premium bands' : 'a bit more predictable even on a higher band'}. You are using about ${kpp.toFixed(1)} kWh per person versus the 22 kWh reference — your lighting and phone charging already look lean, so keep those habits while you smooth the evening peak.`;
}

export default function HouseholdReportPage() {
  const { accountHash: routeHash } = useParams();
  const [searchParams] = useSearchParams();
  const { accounts } = useSyntheticData();

  const accountHash = routeHash || searchParams.get('account') || 'ACC_004521';

  const account = useMemo(
    () => accounts.find((a) => a.account_hash.toUpperCase() === accountHash.toUpperCase()) || null,
    [accounts, accountHash],
  );

  const donut = account ? applianceBreakdown(account) : [];
  const COLORS = ['#22c55e', '#3b82f6', '#f97316', '#06b6d4', '#a855f7', '#94a3b8'];
  const series = account ? monthlySeries(account) : [];
  const lifelineKwh = account?.classification === 'GREEN' ? 55 : account?.classification === 'YELLOW' ? 120 : 220;

  const tierProgress = useMemo(() => {
    if (!account) return { pct: 0, next: '', warn: false };
    const s = account.final_score;
    if (account.classification === 'GREEN') {
      const pct = Math.min(100, (s / SCORE_GREEN_MAX) * 100);
      const warn = s >= SCORE_GREEN_MAX * 0.85;
      return { pct, next: `Next band (Yellow) starts above ${SCORE_GREEN_MAX}`, warn };
    }
    if (account.classification === 'YELLOW') {
      const span = SCORE_YELLOW_MAX - SCORE_GREEN_MAX;
      const pct = Math.min(100, ((s - SCORE_GREEN_MAX) / span) * 100);
      const warn = s >= SCORE_YELLOW_MAX - span * 0.15;
      return { pct, next: `Red band starts above ${SCORE_YELLOW_MAX}`, warn };
    }
    const span = 100 - SCORE_YELLOW_MAX;
    const pct = Math.min(100, ((s - SCORE_YELLOW_MAX) / span) * 100);
    return { pct, next: 'You are on the highest tariff band in this model', warn: false };
  }, [account]);

  const trendMsg = useMemo(() => {
    if (!series.length) return null;
    const first = series.slice(0, 3).reduce((a, b) => a + b.kwh, 0) / 3;
    const last = series.slice(-3).reduce((a, b) => a + b.kwh, 0) / 3;
    const chg = ((last - first) / Math.max(first, 1)) * 100;
    if (chg > 8) {
      return { tone: 'amber', text: `Your usage has increased about ${Math.round(chg)}% over the last few months — worth revisiting evening routines.` };
    }
    if (chg < -5) {
      return { tone: 'green', text: 'Great work — your consumption trend is improving compared with earlier months.' };
    }
    return { tone: 'muted', text: 'Your monthly use has been fairly steady — small shifts can still add up.' };
  }, [series]);

  if (!account) {
    return (
      <PageFade className="p-8 max-w-lg mx-auto">
        <div className="card p-8 text-center space-y-3">
          <p className="text-body font-semibold">We could not find that account.</p>
          <p className="text-sm text-muted">
            Check the ID or pick a household from Account Lookup or Account Intelligence.
          </p>
          <Link to="/lookup" className="inline-block text-primary font-semibold">
            Go to Account Lookup
          </Link>
        </div>
      </PageFade>
    );
  }

  return (
    <PageFade className="p-5 md:p-8 max-w-[900px] mx-auto space-y-6 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">My Energy Report</p>
          <h1 className="text-xl font-bold text-primary">Household {account.account_hash}</h1>
          <p className="text-sm text-muted">{account.county}</p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/lookup?account=${encodeURIComponent(account.account_hash)}`}
            className="px-3 py-2 rounded-lg border border-border text-sm font-semibold text-body hover:bg-surface-muted"
          >
            Regulator view
          </Link>
          <Link to="/" className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-semibold">
            Back to Vitals
          </Link>
        </div>
      </div>

      <section className="card p-6 space-y-4">
        <h2 className="text-sm font-bold text-primary">Your tier status</h2>
        <div className="flex flex-wrap items-center gap-4">
          <span
            className={`inline-flex px-5 py-2 rounded-full text-lg font-extrabold border-2 ${
              account.classification === 'GREEN'
                ? 'bg-emerald-50 text-tier-green border-emerald-300'
                : account.classification === 'YELLOW'
                  ? 'bg-amber-50 text-tier-yellow border-amber-300'
                  : 'bg-red-50 text-tier-red border-red-300'
            }`}
          >
            {account.classification}
          </span>
          <div className="text-sm text-body">
            Current tariff multiplier:{' '}
            <span className="font-mono font-bold text-primary text-lg">{account.tariff}×</span>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs font-semibold text-muted mb-1">
            <span>Distance to next band (model score)</span>
            <span>{account.final_score} / 100</span>
          </div>
          <div className="h-3 rounded-full bg-surface-muted border border-border overflow-hidden">
            <div
              className={`h-full ${tierBarClass(account.final_score)}`}
              style={{ width: `${tierProgress.pct}%` }}
            />
          </div>
          <p className="text-[11px] text-muted mt-1">{tierProgress.next}</p>
        </div>
        {tierProgress.warn && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-950 text-sm px-3 py-2">
            You are close to moving to a higher tariff this month — small evening reductions matter most.
          </div>
        )}
      </section>

      <section className="card p-6">
        <h2 className="text-sm font-bold text-primary mb-4">Where your electricity goes</h2>
        <p className="text-xs text-muted mb-3">
          Estimated split from your peak-demand fingerprint (illustrative for this demo).
        </p>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={donut} dataKey="value" nameKey="name" innerRadius={70} outerRadius={100} paddingAngle={1}>
                {donut.map((d, i) => (
                  <Cell key={d.name} fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth={1} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${v}%`, 'Share']} />
              <Legend layout="horizontal" verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card p-6 space-y-4">
        <h2 className="text-sm font-bold text-primary">Your consumption coaching</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {coachingCards(account).map((c) => (
            <div key={c.title} className="rounded-xl border border-border p-4 bg-surface-muted/40 space-y-2">
              <div className="text-sm font-bold text-body leading-snug">{c.title}</div>
              <div className="text-xs text-muted">
                Saves ~<span className="font-semibold text-body">KSh {c.ksh}</span>/mo · ~{' '}
                <span className="font-semibold text-body">{c.kwh} kWh</span>
              </div>
              <div className="text-[11px] text-tier-green font-semibold">{c.tier}</div>
              <p className="text-[11px] text-muted leading-snug">{c.how}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-sm font-bold text-primary mb-2">Your 6-month trend</h2>
        <p className="text-xs text-muted mb-3">Synthetic month-to-month view anchored on your current month.</p>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} label={{ value: 'kWh', angle: -90, position: 'insideLeft', fontSize: 10 }} />
              <Tooltip />
              <ReferenceLine
                y={lifelineKwh}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                label={{ value: 'Illustrative lifeline band', position: 'top', fill: '#64748b', fontSize: 10 }}
              />
              <Line type="monotone" dataKey="kwh" stroke="#1B3A6B" strokeWidth={2} dot={{ r: 3 }} name="kWh" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {trendMsg && (
          <p
            className={`text-sm mt-3 ${
              trendMsg.tone === 'amber'
                ? 'text-amber-800'
                : trendMsg.tone === 'green'
                  ? 'text-tier-green'
                  : 'text-muted'
            }`}
          >
            {trendMsg.text}
          </p>
        )}
      </section>

      <section className="card p-6 bg-surface-muted/50 border-dashed">
        <h2 className="text-sm font-bold text-primary mb-2">A note for your household</h2>
        <p className="text-sm text-body leading-relaxed">{aiMessage(account)}</p>
        <p className="text-[11px] text-muted mt-3">
          Same underlying data as the regulator dashboard — shown here in everyday language. Live LLM wording can
          replace this block when an API key is configured.
        </p>
      </section>
    </PageFade>
  );
}

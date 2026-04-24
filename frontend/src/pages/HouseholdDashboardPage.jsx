import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import PageFade from '../components/Layout/PageFade';
import { useSyntheticData } from '../context/SyntheticDataContext';
import { useDashboardMode } from '../context/DashboardModeContext';
import { fetchHouseholdAdvisor } from '../api/householdAdvisor';
import { useNaji } from '../context/NajiContext';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const LIFELINE = 100;

function hashSeed(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

function lastSixMonthLabels() {
  const out = [];
  const d = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(x.toLocaleString('en-GB', { month: 'short' }));
  }
  return out;
}

function sixMonthSeries(account) {
  const labels = lastSixMonthLabels();
  const current = account.kwh_month;
  const seed = hashSeed(account.account_hash);
  const wobble = (i) => (((seed >> (i * 3)) % 17) - 8) / 100;
  return labels.map((month, i) => {
    const drift = 0.82 + i * 0.028 + wobble(i);
    const v = Math.max(12, Math.round(current * drift));
    return { month, kwh: i === labels.length - 1 ? current : v };
  });
}

function tierLabel(cls) {
  if (cls === 'GREEN') return 'GREEN PROTECTED';
  if (cls === 'YELLOW') return 'YELLOW STANDARD';
  return 'RED REVIEW REQUIRED';
}

function gridSafePct(kwh) {
  if (kwh >= LIFELINE) return Math.max(0, 35 - Math.min(35, ((kwh - LIFELINE) / LIFELINE) * 35));
  return Math.round(((LIFELINE - kwh) / LIFELINE) * 100);
}

function gridBarTone(pct) {
  if (pct >= 82) return 'bg-emerald-500';
  if (pct >= 40) return 'bg-amber-400';
  return 'bg-red-500';
}

function smartTip(account) {
  const h = new Date().getHours();
  if (h >= 10 && h <= 15) {
    return 'Peak Sunlight — Optimal time for high-energy appliances. Solar yield at 94% (model estimate for your area).';
  }
  if (h >= 19 && h <= 22) {
    return 'Evening peak — stagger cooking and water heating where you can to stay inside your headroom.';
  }
  return 'Night valley rates — shifting one heavy load after 10pm can trim the next bill without changing comfort.';
}

function threeWaySplit(account) {
  const peak = account.peak_demand_ratio ?? 0.5;
  const cooling = Math.min(0.55, 0.22 + peak * 0.28);
  const lighting = Math.max(0.12, 0.32 - peak * 0.12);
  const other = Math.max(0.15, 1 - cooling - lighting);
  const t = cooling + lighting + other;
  return [
    { name: 'Cooling', key: 'cool', pct: (cooling / t) * 100, fill: '#1e3a5f' },
    { name: 'Lighting', key: 'light', pct: (lighting / t) * 100, fill: '#16a34a' },
    { name: 'Other', key: 'other', pct: (other / t) * 100, fill: '#d97706' },
  ];
}

export default function HouseholdDashboardPage() {
  const { isHousehold, householdAccountHash } = useDashboardMode();
  const { accounts } = useSyntheticData();
  const { speak } = useNaji();
  const [unit, setUnit] = useState('kwh');
  const [activeMonth, setActiveMonth] = useState(null);
  const [najiLine, setNajiLine] = useState('');
  const rate = 22;

  const account = useMemo(
    () =>
      accounts.find((a) => a.account_hash.toUpperCase() === (householdAccountHash || '').toUpperCase()) || null,
    [accounts, householdAccountHash],
  );

  const series = useMemo(() => (account ? sixMonthSeries(account) : []), [account]);
  const chartData = useMemo(
    () =>
      series.map((r) => ({
        ...r,
        val: unit === 'kwh' ? r.kwh : Math.round(r.kwh * rate * (account?.tariff ?? 1)),
      })),
    [series, unit, account],
  );

  const donut = useMemo(() => (account ? threeWaySplit(account) : []), [account]);
  const safePct = account ? gridSafePct(account.kwh_month) : 0;
  const wardLine = account
    ? `Main Household Meter • ${account.county}${account.ward ? `, ${account.ward}` : ''}`
    : '';

  useEffect(() => {
    if (!account) return;
    const prompt = `You are NAJI, warm Kenyan energy ally. One short spoken-style sentence in quotes tone, second person, about account ${account.account_hash} in ${account.county}, tier ${account.classification}, ${account.kwh_month} kWh this month. No jargon. Max 35 words.`;
    fetchHouseholdAdvisor(prompt)
      .then((t) => setNajiLine(t || `"You're on track—small shifts this week keep your bill gentle for your family."`))
      .catch(() => setNajiLine(`"You're on track—small shifts this week keep your bill gentle for your family."`));
  }, [account]);

  const onSpeakNaji = useCallback(() => {
    if (najiLine) speak(najiLine.replace(/^"|"$/g, ''));
  }, [najiLine, speak]);

  if (!isHousehold) return <Navigate to="/" replace />;
  if (!account) {
    return (
      <PageFade className="p-8 max-w-md mx-auto">
        <div className="card p-6 text-center space-y-3">
          <p className="font-semibold text-body">Account not found in the demo register.</p>
          <Link to="/lookup" className="text-primary font-bold">
            Try Account Lookup
          </Link>
        </div>
      </PageFade>
    );
  }

  return (
    <PageFade className="p-4 sm:p-6 md:p-10 max-w-2xl mx-auto space-y-8 pb-28">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-lg font-bold text-slate-900">{account.account_hash}</span>
          <span
            className={`inline-flex px-3 py-1 rounded-full text-xs font-extrabold border ${
              account.classification === 'GREEN'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : account.classification === 'YELLOW'
                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                  : 'bg-red-50 text-red-900 border-red-200'
            }`}
          >
            {tierLabel(account.classification)}
          </span>
        </div>
        <p className="text-sm text-slate-600">{wardLine}</p>

        <div>
          <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>GRID HEADROOM</span>
            <span>{safePct}% safe</span>
          </div>
          <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
            <div className={`h-full transition-all ${gridBarTone(safePct)}`} style={{ width: `${Math.min(100, safePct)}%` }} />
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 flex gap-3 items-start shadow-sm">
          <span className="text-xl shrink-0" aria-hidden>
            ☀️
          </span>
          <p className="text-sm text-amber-950 leading-relaxed">{smartTip(account)}</p>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">6 Month Consumption Trend</h2>
          <div className="inline-flex rounded-full border border-slate-200 p-0.5 text-[11px] font-bold">
            <button
              type="button"
              className={`px-3 py-1 rounded-full ${unit === 'kwh' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
              onClick={() => setUnit('kwh')}
            >
              kWh
            </button>
            <button
              type="button"
              className={`px-3 py-1 rounded-full ${unit === 'monthly' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
              onClick={() => setUnit('monthly')}
            >
              Monthly
            </button>
          </div>
        </div>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="fillGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#86efac" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#bbf7d0" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={36} />
              <Tooltip
                content={({ active, payload }) =>
                  active && payload?.[0] ? (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                      <div className="font-bold">{payload[0].payload.month}</div>
                      <div>
                        {unit === 'kwh' ? `${payload[0].payload.kwh} kWh` : `~KSh ${payload[0].payload.val}`}
                      </div>
                    </div>
                  ) : null
                }
              />
              <ReferenceLine
                y={unit === 'kwh' ? LIFELINE : Math.round(LIFELINE * rate * (account.tariff ?? 1))}
                stroke="#ef4444"
                strokeDasharray="4 4"
              />
              <Area
                type="monotone"
                dataKey="val"
                stroke="#166534"
                strokeWidth={2}
                fill="url(#fillGreen)"
                dot={(dotProps) => {
                  const { cx, cy, index } = dotProps;
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill="#166534"
                      className="cursor-pointer"
                      onClick={() => setActiveMonth(chartData[index])}
                    />
                  );
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {activeMonth && (
          <p className="text-xs text-slate-600">
            Selected {activeMonth.month}: {unit === 'kwh' ? `${activeMonth.kwh} kWh` : `~KSh ${activeMonth.val}`}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900">Where Your Electricity Goes</h2>
        <div className="relative h-[220px] max-w-xs mx-auto">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donut}
                dataKey="pct"
                nameKey="name"
                innerRadius={58}
                outerRadius={88}
                paddingAngle={2}
              >
                {donut.map((d) => (
                  <Cell key={d.key} fill={d.fill} stroke="#fff" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${Math.round(v)}%`, 'Share']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="text-center pt-1">
              <div className="text-xs text-slate-500">Total</div>
              <div className="text-xl font-bold text-slate-900">{account.kwh_month} kWh</div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          {donut.map((d) => (
            <span key={d.key} className="inline-flex items-center gap-2 text-slate-700">
              <span className="w-3 h-3 rounded-full" style={{ background: d.fill }} />
              {d.name} {Math.round(d.pct)}%
            </span>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-bold text-slate-900">Your actions</h2>
        <div className="space-y-3">
          {[
            {
              title: 'Smart Reduction',
              body: 'Schedule water heating after 10pm this week to avoid evening peak pricing.',
              link: 'Set Automation',
            },
            {
              title: 'Equity Savings',
              body: `You have earned KSh ${120 + Math.round(account.kwh_month / 4)} in grid stability rewards this quarter (demo).`,
              link: 'View Wallet',
            },
            {
              title: 'Upgrade Path',
              body: `Replacing your main room AC with a 4-star inverter could pay back in ${14 + (account.has_three_phase ? 4 : 0)} months at your usage.`,
              link: 'Get Proposal',
            },
          ].map((c) => (
            <article
              key={c.title}
              className="rounded-2xl border border-slate-100 bg-white pl-4 pr-4 py-4 shadow-sm border-l-4 border-l-emerald-500 flex flex-col gap-2"
            >
              <h3 className="font-bold text-slate-900">{c.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{c.body}</p>
              <button type="button" className="text-sm font-bold text-blue-600 text-left hover:underline">
                {c.link} &gt;
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/40 p-5 shadow-md space-y-4">
        <div className="flex gap-4 items-start">
          <div className="relative shrink-0">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=NajiKenya&mouth=smile&eyes=happy"
              alt="NAJI"
              className="w-16 h-16 rounded-full border-4 border-white shadow-lg bg-sky-100"
            />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="text-xs font-bold text-blue-800 uppercase tracking-wide">NAJI, your Energy Ally</div>
            <div className="flex gap-2 items-start">
              <p className="text-sm text-slate-800 leading-relaxed flex-1 italic border-l-4 border-blue-400 pl-3">
                {najiLine || '…'}
              </p>
              <button
                type="button"
                onClick={onSpeakNaji}
                className="shrink-0 w-9 h-9 rounded-full border border-blue-200 bg-white text-lg hover:bg-blue-50"
                aria-label="Speak message"
              >
                🔊
              </button>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => speak('Reminder set for tomorrow evening to review your heavy loads.')}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-sm"
              >
                Yes, remind me
              </button>
              <button
                type="button"
                onClick={() => speak('Your tier reflects six equity signals including evening demand and household capacity.')}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
              >
                Show me why
              </button>
            </div>
          </div>
        </div>
      </section>

      <Link to={`/household/${encodeURIComponent(account.account_hash)}`} className="block text-center text-sm font-bold text-blue-600 hover:underline">
        Open full energy report (detailed)
      </Link>
    </PageFade>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import PageFade from '../components/Layout/PageFade';
import { useSyntheticData } from '../context/SyntheticDataContext';
import { fetchHouseholdAdvisor } from '../api/householdAdvisor';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

const LIFELINE_KWH = 100;

const DONUT_COLORS = ['#93c5fd', '#a5b4fc', '#818cf8', '#6366f1', '#7c3aed', '#c4b5fd'];

const CATEGORY_KEYS = [
  { key: 'lighting', label: 'Lighting' },
  { key: 'entertainment', label: 'Entertainment' },
  { key: 'cooking', label: 'Cooking' },
  { key: 'water', label: 'Water heating' },
  { key: 'heavy', label: 'Heavy appliances' },
  { key: 'standby', label: 'Standby/other' },
];

function hashSeed(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

/** Estimated shares (0–1) from peak + capacity — demo illustration. */
function applianceShares(account) {
  const peak = account.peak_demand_ratio ?? 0.5;
  const heavy = account.has_three_phase ? 0.22 + peak * 0.15 : peak * 0.18;
  const cooking = 0.12 + (1 - peak) * 0.1;
  const water = 0.08 + peak * 0.12;
  const ent = 0.1 + (1 - peak) * 0.08;
  const light = Math.max(0.05, 0.28 - heavy * 0.3);
  const standby = Math.max(0.04, 1 - heavy - cooking - water - ent - light);
  const raw = [
    { key: 'lighting', v: light },
    { key: 'entertainment', v: ent },
    { key: 'cooking', v: cooking },
    { key: 'water', v: water },
    { key: 'heavy', v: heavy },
    { key: 'standby', v: standby },
  ];
  const t = raw.reduce((s, x) => s + x.v, 0);
  return raw.map((x) => ({ ...x, share: x.v / t }));
}

function breakdownKwh(account) {
  const shares = applianceShares(account);
  const total = account.kwh_month;
  return shares.map((s) => {
    const kwh = Math.round(s.share * total * 10) / 10;
    const meta = CATEGORY_KEYS.find((c) => c.key === s.key);
    return { key: s.key, label: meta?.label ?? s.key, share: s.share, kwh };
  });
}

function lastSixMonthLabels() {
  const out = [];
  const d = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(x.toLocaleString('en-GB', { month: 'short', year: 'numeric' }));
  }
  return out;
}

function sixMonthKwhSeries(account) {
  const labels = lastSixMonthLabels();
  const current = account.kwh_month;
  const seed = hashSeed(account.account_hash);
  const h = account.account_hash.toUpperCase();

  const wobble = (i) => (((seed >> (i * 3)) % 17) - 8) / 100;

  if (h === 'ACC_004521') {
    const vals = [52, 47, 44, 40, 38, current];
    return labels.map((month, i) => ({ month, kwh: vals[i] }));
  }
  if (h === 'ACC_168669') {
    const vals = [215, 248, 275, 302, 328, current];
    return labels.map((month, i) => ({ month, kwh: vals[i] }));
  }
  if (h === 'ACC_772301') {
    const vals = [520, 545, 560, 575, 582, current];
    return labels.map((month, i) => ({ month, kwh: Math.round(vals[i] * (1 + wobble(i) * 0.04)) }));
  }

  if (account.classification === 'GREEN') {
    return labels.map((month, i) => {
      const drift = 0.88 + i * 0.022 + wobble(i);
      const v = Math.max(12, Math.round(current * drift));
      return { month, kwh: i === labels.length - 1 ? current : v };
    });
  }
  if (account.classification === 'RED') {
    return labels.map((month, i) => {
      const drift = 0.72 + i * 0.055 + wobble(i);
      const v = Math.max(40, Math.round(current * drift));
      return { month, kwh: i === labels.length - 1 ? current : v };
    });
  }
  return labels.map((month, i) => {
    const drift = 0.8 + i * 0.04 + wobble(i);
    const v = Math.max(20, Math.round(current * drift));
    return { month, kwh: i === labels.length - 1 ? current : v };
  });
}

function chartStackRows(series) {
  return series.map((row) => {
    const { kwh } = row;
    const stackBase = Math.min(kwh, LIFELINE_KWH);
    const greenBand = kwh < LIFELINE_KWH ? LIFELINE_KWH - kwh : 0;
    const redBand = kwh >= LIFELINE_KWH ? kwh - LIFELINE_KWH : 0;
    return { ...row, stackBase, greenBand, redBand };
  });
}

function trendCopy(series) {
  if (series.length < 4) return null;
  const first3 = series.slice(0, 3).reduce((a, b) => a + b.kwh, 0) / 3;
  const last3 = series.slice(-3).reduce((a, b) => a + b.kwh, 0) / 3;
  const chg = ((last3 - first3) / Math.max(first3, 1)) * 100;
  if (chg < -2) {
    return {
      tone: 'green',
      text: `Your consumption has decreased ${Math.abs(Math.round(chg))}% over the last 3 months — you are moving in the right direction`,
    };
  }
  if (chg > 2) {
    return {
      tone: 'amber',
      text: `Your consumption has increased ${Math.round(chg)}% over the last 3 months — you are at risk of moving to a higher tier`,
    };
  }
  return {
    tone: 'muted',
    text: 'Your consumption has been fairly steady over the last 3 months — small changes still add up over time',
  };
}

function tierHeadline(cls) {
  if (cls === 'GREEN') return 'GREEN PROTECTED';
  if (cls === 'YELLOW') return 'YELLOW STANDARD';
  return 'RED REVIEW REQUIRED';
}

function boundaryBarState(kwhMonth) {
  const ratio = kwhMonth / LIFELINE_KWH;
  const fillPct = Math.min(100, ratio * 100);
  let fillClass = 'bg-emerald-500';
  if (ratio >= 1) fillClass = 'bg-red-500';
  else if (ratio >= 0.85) fillClass = 'bg-amber-400';
  return { fillPct, fillClass, ratio };
}

function headroomLine(account) {
  const k = account.kwh_month;
  if (k <= LIFELINE_KWH) {
    const head = LIFELINE_KWH - k;
    return `Current consumption: ${k} kWh — Lifeline threshold: ${LIFELINE_KWH} kWh — You have ${head} kWh of headroom this month.`;
  }
  const over = k - LIFELINE_KWH;
  return `Current consumption: ${k} kWh — Lifeline threshold: ${LIFELINE_KWH} kWh — You are ${over} kWh above the lifeline reference this month.`;
}

function kshPerKwh(account) {
  return 18 + Math.min(14, (account.tariff ?? 1) * 6);
}

function actionCards(account) {
  const h = account.account_hash.toUpperCase();
  const cls = account.classification;

  if (h === 'ACC_004521') {
    return [
      {
        title: 'Keep using LED bulbs',
        ksh: 'KSh 80/month',
        kwh: '8 kWh reduction',
        line: 'Saves KSh 80/month compared with old incandescent bulbs.',
        impact: 'Maintains GREEN tier status.',
      },
      {
        title: 'Unplug devices on standby overnight',
        ksh: 'KSh 40/month',
        kwh: '4 kWh reduction',
        line: 'Switch off entertainment strips before bed so nothing hums in the background.',
        impact: 'Keeps consumption efficient.',
      },
      {
        title: 'You are using electricity efficiently',
        ksh: 'Well within tier',
        kwh: `${account.kwh_month} kWh this month`,
        line: `Your consumption is ${account.kwh_month} kWh this month, well within the protected tier.`,
        impact: 'Keep doing what you are doing — small habits add up for your household.',
      },
    ];
  }

  if (h === 'ACC_168669') {
    return [
      {
        title: 'Shift water pump or heavy appliances to off-peak hours 10pm–5am',
        ksh: 'KSh 340/month',
        kwh: '30 kWh reduction',
        line: 'Run large loads when the grid and your neighbourhood demand are quieter.',
        impact: 'Reduces cross-subsidy contribution.',
      },
      {
        title: 'Review air conditioning usage',
        ksh: 'KSh 520/month',
        kwh: '≈18 kWh if you trim 2 h/day',
        line: 'Detected as highest draw appliance — reducing by 2 hours daily saves about this much.',
        impact: 'Would lower peak draw on your meter.',
      },
      {
        title: 'Your current usage and bill outlook',
        ksh: 'Up to KSh 860/mo',
        kwh: 'Combined estimate',
        line: 'Your current usage places you in the full cost-reflective tier.',
        impact: 'These changes would reduce your monthly bill by an estimated KSh 860.',
      },
    ];
  }

  if (cls === 'RED') {
    return [
      {
        title: 'Shift water pump or heavy appliances to off-peak hours 10pm–5am',
        ksh: `KSh ${280 + Math.round((account.peak_demand_ratio ?? 0.5) * 80)}/month`,
        kwh: `${22 + Math.round((account.peak_demand_ratio ?? 0.5) * 12)} kWh`,
        line: 'Run large loads when evening demand is quieter.',
        impact: 'Reduces cross-subsidy contribution and softens your bill.',
      },
      {
        title: 'Review your highest-draw appliances',
        ksh: `KSh ${420 + Math.round(account.kwh_month / 25)}/month`,
        kwh: `${16 + Math.round(account.kwh_month / 40)} kWh`,
        line: 'Shorten daily runtime on cooling, pumping, or workshop tools where you can.',
        impact: 'Helps you stay further from the next tariff step.',
      },
      {
        title: 'Plan one week of “lighter load” evenings',
        ksh: `KSh ${650 + Math.round(account.kwh_month / 20)}/month`,
        kwh: 'Combined estimate',
        line: 'Spread ironing, heating, and pumping across the week.',
        impact: 'Your profile suggests meaningful savings if usage trends down steadily.',
      },
    ];
  }

  if (cls === 'GREEN') {
    return [
      {
        title: 'Keep efficient lighting habits',
        ksh: `KSh ${60 + Math.round((1 - (account.peak_demand_ratio ?? 0.5)) * 40)}/month`,
        kwh: `${6 + Math.round((1 - (account.peak_demand_ratio ?? 0.5)) * 4)} kWh`,
        line: 'LEDs where you still have older bulbs make the biggest difference.',
        impact: 'Helps maintain GREEN protected status.',
      },
      {
        title: 'Switch off standby devices overnight',
        ksh: 'KSh 35–50/month',
        kwh: '3–5 kWh',
        line: 'Entertainment stacks quietly add units while you sleep.',
        impact: 'Keeps your monthly use predictable and lean.',
      },
      {
        title: 'You are in a good place this month',
        ksh: 'Stable tier',
        kwh: `${account.kwh_month} kWh`,
        line: 'Your consumption sits where the model expects for a protected household.',
        impact: 'Consistency is what keeps the bill gentle for your family.',
      },
    ];
  }

  return [
    {
      title: 'Smooth your evening peak',
      ksh: `KSh ${180 + Math.round((account.peak_demand_ratio ?? 0.5) * 90)}/month`,
      kwh: `${10 + Math.round((account.peak_demand_ratio ?? 0.5) * 8)} kWh`,
      line: 'Move ironing, pumping, or heavy cooking slightly later when you can.',
      impact: 'Reduces risk of drifting from YELLOW toward RED.',
    },
    {
      title: 'Target standby and entertainment stacks',
      ksh: `KSh ${90 + Math.round(account.kwh_month / 80)}/month`,
      kwh: `${5 + Math.round(account.kwh_month / 120)} kWh`,
      line: 'One power strip per corner makes it easy to cut phantom load.',
      impact: 'Small savings that add up across the month.',
    },
    {
      title: 'Check your monthly rhythm',
      ksh: 'Plan ahead',
      kwh: `${account.kwh_month} kWh`,
      line: 'If a big bill month is coming (visitors, heat), spread heavy tasks across weeks.',
      impact: 'Keeps you in standard retail terms without surprises.',
    },
  ];
}

function buildHouseholdPrompt(account, highestCategory, consumptionTrend, headroomKwh) {
  return `
You are a friendly energy advisor helping a Kenyan household 
understand their electricity usage. 
Speak directly to the household in second person (you/your).
Be warm, encouraging, and practical. 
Never use regulatory or technical language.
Keep it to exactly 3 sentences.

Household details:
- Location: ${account.county}, ${account.urban_rural_classification}
- Current tier: ${account.classification}
- Monthly consumption: ${account.kwh_month} kWh
- Biggest usage category: ${highestCategory}
- Months trending: ${consumptionTrend}
- Disconnection days last month: ${account.avg_disconnection_days_per_month}
- Distance from tier boundary: ${headroomKwh} kWh

Give them one specific observation about their usage,
one specific action they can take this week,
and one encouraging statement about what staying 
in their current tier means for their family.
`.trim();
}

function fallbackAdvisorText(account, highestCategory) {
  return `You use most of your units on ${highestCategory}, which is normal for many homes in ${account.county.split('(')[0].trim()}. This week, try switching off one entertainment strip at night and see how it feels on your routine. Staying in your current band means your household keeps predictable, fair support on the bill while you build steady savings habits.`;
}

export default function HouseholdReportPage() {
  const { accountHash: routeHash } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { accounts } = useSyntheticData();

  const resolvedFromUrl = routeHash || searchParams.get('account');
  const accountHash = resolvedFromUrl?.trim() ? resolvedFromUrl.trim() : 'ACC_004521';

  const [searchDraft, setSearchDraft] = useState(accountHash);

  useEffect(() => {
    setSearchDraft(accountHash);
  }, [accountHash]);

  const account = useMemo(
    () => accounts.find((a) => a.account_hash.toUpperCase() === accountHash.toUpperCase()) || null,
    [accounts, accountHash],
  );

  const breakdown = useMemo(() => (account ? breakdownKwh(account) : []), [account]);
  const donutData = useMemo(
    () => breakdown.map((b) => ({ name: b.label, value: Math.round(b.kwh * 10) / 10 })),
    [breakdown],
  );
  const ranked = useMemo(() => [...breakdown].sort((a, b) => b.kwh - a.kwh), [breakdown]);
  const rate = account ? kshPerKwh(account) : 18;
  const rankedCost = useMemo(
    () => ranked.map((r) => ({ ...r, ksh: Math.round(r.kwh * rate) })),
    [ranked, rate],
  );
  const highestCategory = ranked[0]?.label ?? 'mixed uses';

  const series = useMemo(() => (account ? sixMonthKwhSeries(account) : []), [account]);
  const chartRows = useMemo(() => chartStackRows(series), [series]);
  const trend = useMemo(() => trendCopy(series), [series]);
  const consumptionTrend = trend?.text ?? 'steady use compared with earlier months';

  const headroomKwh = useMemo(() => {
    if (!account) return 0;
    return Math.round((LIFELINE_KWH - account.kwh_month) * 10) / 10;
  }, [account]);

  const boundary = account ? boundaryBarState(account.kwh_month) : null;

  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!account) return undefined;
    let cancelled = false;
    const hi = [...breakdownKwh(account)].sort((a, b) => b.kwh - a.kwh)[0]?.label ?? 'mixed uses';
    const ser = sixMonthKwhSeries(account);
    const tr = trendCopy(ser);
    const trendLine = tr?.text ?? 'steady use compared with earlier months';
    const head = Math.round((LIFELINE_KWH - account.kwh_month) * 10) / 10;
    const prompt = buildHouseholdPrompt(account, hi, trendLine, head);
    setAiLoading(true);
    setAiText('');
    fetchHouseholdAdvisor(prompt)
      .then((t) => {
        if (!cancelled && t) setAiText(t);
        else if (!cancelled) setAiText(fallbackAdvisorText(account, hi));
      })
      .catch(() => {
        if (!cancelled) setAiText(fallbackAdvisorText(account, hi));
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [account]);

  const onLoadAccount = useCallback(() => {
    const id = searchDraft.trim();
    if (!id) return;
    navigate(`/household/${encodeURIComponent(id)}`);
  }, [navigate, searchDraft]);

  const onPrint = useCallback(() => {
    window.print();
  }, []);

  if (!account) {
    return (
      <PageFade className="p-6 md:p-10 max-w-lg mx-auto">
        <div className="card p-8 text-center space-y-4 rounded-2xl">
          <p className="text-body font-semibold text-lg">We could not find that account.</p>
          <p className="text-sm text-muted leading-relaxed">
            Check the Account ID or open a household from Account Lookup or Account Intelligence.
          </p>
          <Link to="/lookup" className="inline-block text-blue-600 font-semibold hover:underline">
            Go to Account Lookup
          </Link>
        </div>
      </PageFade>
    );
  }

  const cards = actionCards(account);
  const totalKwh = account.kwh_month;

  return (
    <PageFade className="household-report-print-root p-4 sm:p-6 md:p-10 max-w-4xl mx-auto pb-20 space-y-8 md:space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Personal report</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Your Energy Report</h1>
          <p className="text-sm text-slate-600 max-w-md leading-relaxed no-print">
            Plain-language view for your household. Everything below scrolls on one page — no tabs, no hidden panels.
          </p>
        </div>
        <button
          type="button"
          onClick={onPrint}
          className="no-print self-start sm:self-auto shrink-0 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Print summary
        </button>
      </div>

      <section className="no-print rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-3">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide" htmlFor="acct-search">
          Load another household
        </label>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-stretch">
          <input
            id="acct-search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Account ID e.g. ACC_004521"
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            onKeyDown={(e) => e.key === 'Enter' && onLoadAccount()}
          />
          <button
            type="button"
            onClick={onLoadAccount}
            className="px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
          >
            Load report
          </button>
        </div>
      </section>

      {/* Section 1 */}
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/80 p-5 sm:p-7 shadow-sm space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-4 items-center">
          <div className="space-y-1 text-center lg:text-left">
            <div className="font-mono text-lg font-bold text-slate-900">{account.account_hash}</div>
            <div className="text-slate-700">{account.county}</div>
            <div className="text-sm text-slate-500">{account.urban_rural_classification}</div>
          </div>
          <div className="flex flex-col items-center justify-center text-center space-y-2">
            <div
              className={`inline-flex px-4 py-2 sm:px-6 sm:py-3 rounded-2xl text-sm sm:text-base font-extrabold tracking-wide border-2 ${
                account.classification === 'GREEN'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : account.classification === 'YELLOW'
                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                    : 'bg-red-50 text-red-900 border-red-200'
              }`}
            >
              {tierHeadline(account.classification)}
            </div>
            <div className="text-slate-700 text-sm sm:text-base">
              Tariff multiplier{' '}
              <span className="font-bold text-slate-900 text-lg sm:text-xl">{account.tariff}×</span>
            </div>
          </div>
          <div className="space-y-2 lg:pl-2">
            <div className="flex justify-between text-xs font-semibold text-slate-500">
              <span>Distance from next tier boundary</span>
              <span className="font-mono text-slate-700">{Math.round(account.kwh_month)} / {LIFELINE_KWH} kWh</span>
            </div>
            <div className="h-3.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full transition-all ${boundary?.fillClass ?? 'bg-slate-400'}`}
                style={{ width: `${boundary?.fillPct ?? 0}%` }}
              />
            </div>
          </div>
        </div>
        <p className="text-sm text-slate-600 text-center lg:text-left leading-relaxed border-t border-slate-100 pt-4">
          {headroomLine(account)}
        </p>
      </section>

      {/* Section 2 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900">Where Your Electricity Goes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="relative h-[280px] sm:h-[300px] w-full max-w-md mx-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="88%"
                  paddingAngle={2}
                >
                  {donutData.map((_, i) => (
                    <Cell key={donutData[i].name} fill={DONUT_COLORS[i % DONUT_COLORS.length]} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v} kWh`, 'Estimated']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center pr-[0%] pt-[2%]">
              <div className="text-center">
                <div className="text-xs text-slate-500">Total this month</div>
                <div className="text-xl sm:text-2xl font-bold text-slate-900">{totalKwh} kWh</div>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <ol className="space-y-3">
              {rankedCost.map((row, idx) => (
                <li
                  key={row.key}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800">{row.label}</span>
                      {idx === 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                          <span aria-hidden>⚑</span> Biggest opportunity
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      <span className="font-mono font-semibold text-slate-700">{row.kwh} kWh</span>
                      {' · '}
                      <span>est. KSh {row.ksh}/mo</span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-xs text-slate-500 italic leading-relaxed">
              Estimates based on your usage pattern and average appliance consumption rates.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3 */}
      <section className="space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900">Your action plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map((c) => (
            <article
              key={c.title}
              className="rounded-2xl border border-slate-100 bg-white pl-4 pr-4 py-5 shadow-sm border-l-4 border-l-emerald-500 space-y-3"
            >
              <h3 className="font-bold text-slate-900 leading-snug">{c.title}</h3>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 text-xs font-bold border border-emerald-100">
                  {c.ksh}
                </span>
                <span className="inline-flex px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                  {c.kwh}
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{c.line}</p>
              <p className="text-[11px] text-slate-500 leading-snug pt-1 border-t border-slate-100">{c.impact}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Section 4 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900">Your 6 month consumption trend</h2>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartRows} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="bandGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#86efac" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#bbf7d0" stopOpacity={0.25} />
                </linearGradient>
                <linearGradient id="bandRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fecaca" stopOpacity={0.65} />
                  <stop offset="100%" stopColor="#fee2e2" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={48} />
              <YAxis tick={{ fontSize: 11 }} width={36} label={{ value: 'kWh', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#64748b' }} />
              <Tooltip />
              <ReferenceLine y={LIFELINE_KWH} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Lifeline 100 kWh', position: 'insideTopRight', fill: '#b91c1c', fontSize: 10 }} />
              <Area dataKey="stackBase" stackId="band" stroke="none" fill="transparent" />
              <Area dataKey="greenBand" stackId="band" stroke="none" fill="url(#bandGreen)" />
              <Area dataKey="redBand" stackId="band" stroke="none" fill="url(#bandRed)" />
              <Line type="monotone" dataKey="kwh" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3, fill: '#2563eb' }} name="Your kWh" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {trend && (
          <p
            className={`text-sm sm:text-base leading-relaxed ${
              trend.tone === 'amber' ? 'text-amber-800' : trend.tone === 'green' ? 'text-emerald-800' : 'text-slate-600'
            }`}
          >
            {trend.text}
          </p>
        )}
      </section>

      {/* Section 5 */}
      <section className="rounded-2xl border border-slate-200 bg-white pl-4 sm:pl-5 pr-5 py-6 shadow-sm border-l-4 border-l-blue-500 space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
          AI-Generated Insight — Powered by EquityGrid Intelligence Engine
        </p>
        {aiLoading ? (
          <p className="text-sm text-slate-500 italic">Preparing a short personalised note…</p>
        ) : (
          <p className="text-base text-slate-800 leading-relaxed">{aiText || fallbackAdvisorText(account, highestCategory)}</p>
        )}
        <p className="text-xs text-slate-500 leading-relaxed">
          This insight is generated based on your usage pattern. For billing queries contact KPLC on 0703070707.
        </p>
      </section>

      <div className="no-print flex flex-wrap gap-3 text-sm">
        <Link to="/lookup" className="text-blue-600 font-semibold hover:underline">
          Account Lookup
        </Link>
        <span className="text-slate-300">|</span>
        <Link to="/accounts" className="text-blue-600 font-semibold hover:underline">
          Account Intelligence
        </Link>
        <span className="text-slate-300">|</span>
        <Link to="/" className="text-blue-600 font-semibold hover:underline">
          Vitals overview
        </Link>
      </div>
    </PageFade>
  );
}

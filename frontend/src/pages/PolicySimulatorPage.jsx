import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageFade from '../components/Layout/PageFade';
import { useSyntheticData } from '../context/SyntheticDataContext';
import {
  calculatePolicySimulation,
  generateSimulationTableRows,
} from '../data/policyModel';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export default function PolicySimulatorPage() {
  const { stats } = useSyntheticData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [greenDisc, setGreenDisc] = useState(18);
  const [redFee, setRedFee] = useState(12);

  useEffect(() => {
    const g = searchParams.get('greenDiscount');
    if (g == null || g === '') return;
    const n = Number(g);
    if (!Number.isNaN(n)) setGreenDisc(Math.max(0, Math.min(50, n)));
    const next = new URLSearchParams(searchParams);
    next.delete('greenDiscount');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const model = useMemo(() => {
    return calculatePolicySimulation(stats, greenDisc, redFee);
  }, [greenDisc, redFee, stats]);

  const netPositive = model.net >= 0;
  const tilt = Math.max(-18, Math.min(18, model.net / (stats.subsidyManaged || 1) * 40));

  const tableRows = useMemo(() => {
    return generateSimulationTableRows(stats, greenDisc, redFee, model);
  }, [stats, greenDisc, redFee, model]);


  return (
    <PageFade className="p-5 md:p-8 max-w-[1200px] mx-auto space-y-6">
      <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="page-kicker">Scenario analysis</p>
          <h1 className="page-title mt-1">Policy simulator</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted">
            Adjust the two tariff levers and compare affordability with a financially sustainable cross-subsidy position.
          </p>
        </div>
        <div className={`rounded-lg border px-3 py-2 text-right ${netPositive ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
          <span className={`block text-[10px] font-semibold uppercase tracking-[0.1em] ${netPositive ? 'text-emerald-800' : 'text-rose-800'}`}>Projected posture</span>
          <span className={`text-sm font-bold ${netPositive ? 'text-emerald-800' : 'text-rose-800'}`}>{netPositive ? 'Sustainable' : 'Subsidy deficit'}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-sm font-bold text-primary">Policy levers</h2>
              <p className="mt-1 text-xs text-muted">Changes are applied to the full cohort immediately.</p>
            </div>
            <span className="rounded-md bg-navactive px-2 py-1 text-[11px] font-semibold text-primary">Live model</span>
          </div>
          <div>
            <div className="flex justify-between text-sm font-semibold text-body mb-2">
              <span>GREEN tier discount</span>
              <span className="text-primary">{greenDisc}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              value={greenDisc}
              onChange={(e) => setGreenDisc(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <p className="text-xs text-muted mt-1">0–50% lifeline discount intensity.</p>
          </div>
          <div>
            <div className="flex justify-between text-sm font-semibold text-body mb-2">
              <span>RED tier equity fee</span>
              <span className="text-primary">{redFee}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={30}
              value={redFee}
              onChange={(e) => setRedFee(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <p className="text-xs text-muted mt-1">0–30% cross-subsidy uplift on flagged accounts.</p>
          </div>

          <div className="rounded-lg border border-border bg-slate-50 px-4 py-4">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted">
              <span>Revenue balance</span>
              <span className={netPositive ? 'text-tier-green' : 'text-tier-red'}>{netPositive ? 'Surplus' : 'Deficit'}</span>
            </div>
            <div className="relative h-2 rounded-full bg-slate-200" aria-label={`Revenue balance: ${netPositive ? 'surplus' : 'deficit'}`}>
              <span className="absolute left-1/2 top-[-3px] h-3.5 w-px bg-slate-400" aria-hidden />
              <span
                className={`absolute top-0 h-2 rounded-full transition-all duration-200 ${netPositive ? 'bg-tier-green' : 'bg-tier-red'}`}
                style={netPositive ? { left: '50%', width: `${Math.abs(tilt) * 2.4}%` } : { right: '50%', width: `${Math.abs(tilt) * 2.4}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="card p-4 border-border">
            <div className="text-xs font-semibold text-muted uppercase tracking-wide">Subsidy cost</div>
            <div className="text-2xl font-extrabold text-tier-yellow mt-2">
              KSh {model.subsidyCost.toLocaleString()}
            </div>
            <p className="text-xs text-muted mt-2">Modelled outflow after GREEN discount.</p>
          </div>
          <div className="card p-4 border-border">
            <div className="text-xs font-semibold text-muted uppercase tracking-wide">Fee revenue</div>
            <div className="text-2xl font-extrabold text-tier-green mt-2">
              KSh {model.feeRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted mt-2">Modelled uplift from RED equity fee.</p>
          </div>
          <div
            className={`card p-4 border-2 ${
              netPositive ? 'border-tier-green' : 'border-tier-red'
            }`}
          >
            <div className="text-xs font-semibold text-muted uppercase tracking-wide">Net balance</div>
            <div className={`text-2xl font-extrabold mt-2 ${netPositive ? 'text-tier-green' : 'text-tier-red'}`}>
              {netPositive ? '+' : ''}
              KSh {model.net.toLocaleString()}
            </div>
            <p className="text-xs text-muted mt-2">
              {netPositive ? 'Surplus — fees outweigh incremental subsidy.' : 'Deficit — discounts dominate fees.'}
            </p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-bold text-primary">What-if comparison</h2>
          <p className="text-xs text-muted mt-1">Three stylised policy postures side by side.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="table-pro min-w-[720px]">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Current model</th>
                <th>EquityGrid conservative</th>
                <th>EquityGrid aggressive</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={row.label}>
                  <td className="font-semibold text-sm">{row.label}</td>
                  <td className="text-sm">{row.current}</td>
                  <td className="text-sm">{row.conservative}</td>
                  <td className="text-sm">{row.aggressive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-4">
        <div className="text-sm font-bold text-primary mb-2">12-month revenue projection (index)</div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={model.months}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB' }} />
              <Legend />
              <Line type="monotone" dataKey="current" name="Current" stroke="#6B7280" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="conservative" name="Conservative" stroke="#1B3A6B" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="aggressive" name="Aggressive" stroke="#16A34A" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <section className="space-y-4 pt-4 border-t border-border">
        <h2 className="text-lg font-bold text-primary">
          Regulatory alignment
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              icon: 'EA',
              label: 'Energy Act 2019 — Section 34',
              text: "EquityGrid operationalises EPRA's mandate to ensure tariffs are just and reasonable by replacing consumption-only classification with six-variable equity scoring.",
            },
            {
              icon: 'DP',
              label: 'Data Protection Act 2019',
              text: 'All household accounts are processed using hashed identifiers. No personally identifiable information is stored or displayed. Every tariff change is written to an immutable audit log.',
            },
            {
              icon: 'NDC',
              label: 'Paris Agreement — Kenya NDC',
              text: "By protecting vulnerable households from disproportionate energy costs, EquityGrid ensures Kenya's clean energy transition does not deepen energy poverty.",
            },
            {
              icon: 'V30',
              label: 'Kenya Vision 2030',
              text: 'Universal affordable energy access is a Vision 2030 pillar. EquityGrid gives EPRA the targeting precision to direct subsidies where they create the most social and economic impact.',
            },
          ].map((c) => (
            <div key={c.label} className="card p-5 border-border flex gap-3">
              <span className="flex h-8 min-w-8 items-center justify-center rounded-md bg-navactive px-1 text-[10px] font-bold text-primary shrink-0" aria-hidden>
                {c.icon}
              </span>
              <div>
                <div className="text-xs font-bold text-primary mb-1">{c.label}</div>
                <p className="text-sm text-body leading-relaxed">{c.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-primary text-white p-6 md:p-8 shadow-card">
          <h3 className="text-base font-bold mb-6">A realistic path to piloting</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            <div className="hidden md:block absolute top-4 left-[12%] right-[12%] h-0.5 bg-white/25" aria-hidden />
            {[
              {
                step: 'Step 1',
                text: 'County pilot — deploy in 3 counties, validate scoring model against real KPLC billing data — Month 1–6',
              },
              {
                step: 'Step 2',
                text: 'Refinement — incorporate NSPS data sharing agreement, EPRA methodology endorsement — Month 6–12',
              },
              {
                step: 'Step 3',
                text: 'National rollout — open source release, standard reporting requirement for all licensed utilities — Year 2+',
              },
            ].map((s) => (
              <div key={s.step} className="relative z-[1] space-y-2">
                <div className="text-xs font-bold text-white/70">{s.step}</div>
                <p className="text-sm leading-relaxed text-white/95">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageFade>
  );
}

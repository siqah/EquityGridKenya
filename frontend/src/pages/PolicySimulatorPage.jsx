import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageFade from '../components/Layout/PageFade';
import { useSyntheticData } from '../context/SyntheticDataContext';
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
    const subsidyCost = Math.round(stats.subsidyManaged * (greenDisc / 50) * 0.85);
    const feeRevenue = Math.round(stats.leakageDetected * (redFee / 30) * 0.75);
    const net = feeRevenue - subsidyCost;
    const months = Array.from({ length: 12 }, (_, i) => {
      const growth = 1 + i * 0.015;
      return {
        month: `M${i + 1}`,
        current: Math.round((feeRevenue * 0.92 - subsidyCost * 1.05) * growth),
        conservative: Math.round((feeRevenue * 0.88 - subsidyCost * 0.97) * growth),
        aggressive: Math.round((feeRevenue * 1.05 - subsidyCost * 0.9) * growth),
      };
    });
    return { subsidyCost, feeRevenue, net, months };
  }, [greenDisc, redFee, stats.leakageDetected, stats.subsidyManaged]);

  const netPositive = model.net >= 0;
  const tilt = Math.max(-18, Math.min(18, model.net / (stats.subsidyManaged || 1) * 40));

  const tableRows = [
    {
      label: 'Avg bill — GREEN tier (model)',
      current: `KSh ${Math.round(900 - greenDisc * 6).toLocaleString()}`,
      conservative: `KSh ${Math.round(920 - greenDisc * 5.2).toLocaleString()}`,
      aggressive: `KSh ${Math.round(860 - greenDisc * 7.1).toLocaleString()}`,
    },
    {
      label: 'Avg bill — RED tier (model)',
      current: `KSh ${Math.round(2100 + redFee * 35).toLocaleString()}`,
      conservative: `KSh ${Math.round(2050 + redFee * 28).toLocaleString()}`,
      aggressive: `KSh ${Math.round(2250 + redFee * 44).toLocaleString()}`,
    },
    {
      label: 'Revenue impact (annual, est.)',
      current: `KSh ${Math.round(model.net * 0.6).toLocaleString()}`,
      conservative: `KSh ${Math.round(model.net * 0.85).toLocaleString()}`,
      aggressive: `KSh ${Math.round(model.net * 1.15).toLocaleString()}`,
    },
    {
      label: 'Households protected (GREEN)',
      current: `${stats.classification_counts.GREEN}`,
      conservative: `${Math.round(stats.classification_counts.GREEN * 0.97)}`,
      aggressive: `${Math.round(stats.classification_counts.GREEN * 1.04)}`,
    },
  ];

  return (
    <PageFade className="p-5 md:p-8 max-w-[1200px] mx-auto space-y-6">
      <p className="text-sm text-muted">
        Adjust policy levers on the synthetic cohort — figures are illustrative for the hackathon storyline.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5 space-y-5">
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

          <div className="flex items-center justify-center py-4">
            <div
              className="text-6xl transition-transform duration-300"
              style={{ transform: `rotate(${tilt}deg)` }}
              aria-hidden
            >
              ⚖️
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
        <h2 className="text-lg font-bold text-primary flex items-center gap-2">
          <span aria-hidden>📄</span>
          Regulatory Alignment
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              icon: '⚖️',
              label: 'Energy Act 2019 — Section 34',
              text: "EquityGrid operationalises EPRA's mandate to ensure tariffs are just and reasonable by replacing consumption-only classification with six-variable equity scoring.",
            },
            {
              icon: '🔒',
              label: 'Data Protection Act 2019',
              text: 'All household accounts are processed using hashed identifiers. No personally identifiable information is stored or displayed. Every tariff change is written to an immutable audit log.',
            },
            {
              icon: '🌿',
              label: 'Paris Agreement — Kenya NDC',
              text: "By protecting vulnerable households from disproportionate energy costs, EquityGrid ensures Kenya's clean energy transition does not deepen energy poverty.",
            },
            {
              icon: '🏁',
              label: 'Kenya Vision 2030',
              text: 'Universal affordable energy access is a Vision 2030 pillar. EquityGrid gives EPRA the targeting precision to direct subsidies where they create the most social and economic impact.',
            },
          ].map((c) => (
            <div key={c.label} className="card p-5 border-border flex gap-3">
              <span className="text-2xl shrink-0" aria-hidden>
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

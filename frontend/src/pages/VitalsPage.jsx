import PageFade from '../components/Layout/PageFade';
import KenyaDeckMap from '../components/Map/KenyaDeckMap';
import { useSyntheticData } from '../context/SyntheticDataContext';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const COLORS = { GREEN: '#16A34A', YELLOW: '#D97706', RED: '#DC2626' };

/**
 * Custom cross-subsidy indicator gauge (Signature visual element)
 */
function SubsidyBalanceGauge({ balance, maxVal = 5000000 }) {
  const percent = Math.max(-100, Math.min(100, (balance / maxVal) * 100));
  const offsetPercent = ((percent + 100) / 2).toFixed(1);
  const isPositive = balance >= 0;

  return (
    <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
      <div className="flex justify-between text-[10px] font-mono text-slate-400">
        <span className="text-tier-red">Deficit</span>
        <span className="font-semibold text-slate-500">Equilibrium</span>
        <span className="text-tier-green">Surplus</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full relative overflow-hidden border border-slate-200/50">
        {/* Midpoint line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-300 z-10"></div>
        {/* Filled bar from center */}
        <div
          className={`absolute top-0 bottom-0 transition-all duration-500 ${
            isPositive ? 'bg-tier-green' : 'bg-tier-red'
          }`}
          style={{
            left: isPositive ? '50%' : `${offsetPercent}%`,
            right: isPositive ? `${100 - offsetPercent}%` : '50%',
          }}
        ></div>
      </div>
      <div className="text-[10px] text-center text-muted">
        Grid Posture: <span className={isPositive ? 'text-tier-green font-bold' : 'text-tier-red font-bold'}>
          {isPositive ? 'Self-Sustaining' : 'Subsidy Stressed'}
        </span>
      </div>
    </div>
  );
}

/**
 * Reusable StatCard layout component
 */
function StatCard({ label, value, detail, variant = 'default', children }) {
  const isHero = variant === 'hero';
  const baseClasses = isHero
    ? 'bg-primary text-white border-primary ring-1 ring-primary/10'
    : 'bg-white border-slate-200 text-body';

  return (
    <div className={`rounded-xl border p-5 shadow-card flex flex-col justify-between min-h-[148px] ${baseClasses}`}>
      <div>
        <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${isHero ? 'text-white/70' : 'text-muted'}`}>
          {label}
        </div>
        <div className={`font-extrabold tracking-tight ${isHero ? 'text-3xl' : 'text-2xl'}`}>
          {value}
        </div>
      </div>
      <div>
        <div className={`text-xs leading-snug mt-2 ${isHero ? 'text-white/80' : 'text-muted'}`}>
          {detail}
        </div>
        {children}
      </div>
    </div>
  );
}

export default function VitalsPage() {
  const { stats } = useSyntheticData();

  const donutData = [
    { name: 'Green (Lifeline)', value: stats.classification_counts.GREEN, key: 'GREEN' },
    { name: 'Yellow (Standard)', value: stats.classification_counts.YELLOW, key: 'YELLOW' },
    { name: 'Red (High Capacity)', value: stats.classification_counts.RED, key: 'RED' },
  ];

  const leakageBars = (stats.topLeakageCounties || []).map((c) => ({
    name: c.name.length > 12 ? `${c.name.slice(0, 11)}…` : c.name,
    leakage: Math.round(c.leakageScore),
  }));

  const revenuePositive = stats.revenueBalance >= 0;

  return (
    <PageFade className="p-5 md:p-8 max-w-[1440px] mx-auto space-y-6">
      {/* EPRA Board Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold">
            EPRA Regulatory Portal
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
            Energy Equity Intelligence
          </h1>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Live database cohort: <span className="font-semibold text-slate-800">{stats.total_accounts.toLocaleString()} households</span> ·{' '}
            <span className="font-semibold text-slate-800">{stats.counties_covered} counties</span> ·{' '}
            <span className="font-semibold text-slate-800">{stats.turkana_exceptions} leakage overrides</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="text-xs font-mono font-semibold text-slate-500">Live Telemetry Synchronized</span>
        </div>
      </header>

      {/* Hero Thesis Element — 3D Map Centered at Top */}
      <section className="card overflow-hidden border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-primary">National Choropleth Extrusion Map</h2>
            <p className="text-xs text-slate-400 mt-0.5">3D heights represent overall subsidy leakage score per county.</p>
          </div>
          <div className="flex gap-4 text-[10px] font-mono text-slate-500 bg-white px-3 py-1 rounded border border-slate-200 shadow-sm">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-tier-green"></span> Green</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-tier-yellow"></span> Yellow</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-tier-red"></span> Red</span>
          </div>
        </div>
        <div className="h-[380px] md:h-[500px] relative bg-slate-950">
          <KenyaDeckMap className="h-full min-h-0" />
        </div>
      </section>

      {/* Analytical KPI Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Managed Subsidies (Annual)"
          value={`KSh ${stats.subsidyManaged.toLocaleString()}`}
          detail={`${stats.classification_counts.GREEN} Green tier households utilizing Lifeline tariffs.`}
        />
        <StatCard
          label="Detected Leakage (Annual)"
          value={`KSh ${stats.leakageDetected.toLocaleString()}`}
          detail={`${stats.classification_counts.RED} Red tier high-consumption accounts flagged.`}
        />
        <StatCard
          label="Cross-Subsidy Balance"
          value={`KSh ${revenuePositive ? '+' : ''}${stats.revenueBalance.toLocaleString()}`}
          detail={
            revenuePositive
              ? 'Surplus: premium surcharges outweigh lifeline outflows.'
              : 'Deficit: lifeline outflows exceed surcharge revenues.'
          }
        >
          <SubsidyBalanceGauge balance={stats.revenueBalance} />
        </StatCard>
        <StatCard
          label="Subsidy Efficiency Reach"
          value={`${stats.efficiencyScore}%`}
          detail="Share of Green households verified as registered NSPS social protection beneficiaries."
          variant="hero"
        />
      </section>

      {/* Model Specifications Callout */}
      <section className="card p-5 border-slate-200 bg-slate-50/50">
        <h3 className="text-xs uppercase font-mono tracking-widest text-primary font-bold mb-2">
          Model Configuration Specification
        </h3>
        <p className="text-xs text-muted mb-4 leading-relaxed">
          The national equity algorithm classifies accounts across a 0–100 scale using six weighted variables.
          Urban / Rural indicators are used strictly for telemetry context and do not alter scores.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { name: 'Consumption / Cap', w: '25%' },
            { name: 'Payment Consistency', w: '22%' },
            { name: 'NSPS Registration', w: '18%' },
            { name: 'Peak Demand Ratio', w: '15%' },
            { name: 'Connection Capacity', w: '12%' },
            { name: 'Meters at Address', w: '8%' },
          ].map((varItem) => (
            <div key={varItem.name} className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between shadow-sm">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight">
                {varItem.name}
              </span>
              <span className="text-lg font-black text-primary mt-1">{varItem.w}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Secondary Chart Analytics */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card flex flex-col min-h-[320px] border-slate-200">
          <div className="px-5 py-4 border-b border-slate-200">
            <span className="text-sm font-semibold text-primary">Tariff Classification Breakdown</span>
            <p className="text-xs text-muted mt-1">Relative division of synthetic households across categories.</p>
          </div>
          <div className="p-4 flex flex-col sm:flex-row items-center gap-4 flex-1">
            <div className="w-full sm:w-1/2 h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={86}
                    paddingAngle={2}
                  >
                    {donutData.map((entry) => (
                      <Cell key={entry.key} fill={COLORS[entry.key]} stroke="#fff" strokeWidth={1} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, n) => [`${v} accounts`, n]}
                    contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full sm:w-1/2 flex flex-col gap-3">
              {donutData.map((d) => (
                <div key={d.key} className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2 text-muted">
                    <span className="w-3 h-3 rounded-full" style={{ background: COLORS[d.key] }} />
                    {d.name}
                  </span>
                  <span className="font-bold text-body tabular-nums">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card flex flex-col min-h-[320px] border-slate-200">
          <div className="px-5 py-4 border-b border-slate-200">
            <span className="text-sm font-semibold text-primary">Cross-Subsidy Leakage by County</span>
            <p className="text-xs text-muted mt-1">Top 5 counties ranked by total leakage risk index.</p>
          </div>
          <div className="p-4 flex-1 min-h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leakageBars} layout="vertical" margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" stroke="#6B7280" fontSize={11} />
                <YAxis type="category" dataKey="name" width={88} stroke="#6B7280" fontSize={11} />
                <Tooltip
                  cursor={{ fill: '#EFF6FF' }}
                  contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB' }}
                />
                <Bar dataKey="leakage" fill="#1B3A6B" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </PageFade>
  );
}

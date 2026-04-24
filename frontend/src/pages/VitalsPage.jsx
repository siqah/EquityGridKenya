import PageFade from '../components/Layout/PageFade';
import KenyaCountyMap from '../components/Map/KenyaCountyMap';
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

function StatCard({ label, value, detail, variant = 'default' }) {
  const base =
    variant === 'hero'
      ? 'bg-primary text-white border-primary md:min-h-[168px] md:flex md:flex-col md:justify-center'
      : 'bg-surface border-border text-body';
  return (
    <div
      className={`rounded-xl border p-5 shadow-card ${base} ${
        variant === 'hero' ? 'md:col-span-1 md:row-span-1 ring-1 ring-primary/10' : ''
      }`}
    >
      <div
        className={`text-[11px] font-semibold uppercase tracking-wide mb-2 ${
          variant === 'hero' ? 'text-white/80' : 'text-muted'
        }`}
      >
        {label}
      </div>
      <div className={`font-extrabold tracking-tight ${variant === 'hero' ? 'text-4xl md:text-5xl' : 'text-2xl'}`}>
        {value}
      </div>
      <div className={`text-xs mt-2 leading-snug ${variant === 'hero' ? 'text-white/90' : 'text-muted'}`}>
        {detail}
      </div>
    </div>
  );
}

export default function VitalsPage() {
  const { stats } = useSyntheticData();

  const donutData = [
    { name: 'Green', value: stats.classification_counts.GREEN, key: 'GREEN' },
    { name: 'Yellow', value: stats.classification_counts.YELLOW, key: 'YELLOW' },
    { name: 'Red', value: stats.classification_counts.RED, key: 'RED' },
  ];

  const leakageBars = (stats.topLeakageCounties || []).map((c) => ({
    name: c.name.length > 12 ? `${c.name.slice(0, 11)}…` : c.name,
    leakage: Math.round(c.leakageScore),
  }));

  const revenuePositive = stats.revenueBalance >= 0;

  return (
    <PageFade className="p-5 md:p-8 max-w-[1440px] mx-auto">
      <div className="mb-6">
        <p className="text-sm text-muted">
          Live synthetic cohort · {stats.total_accounts.toLocaleString()} accounts ·{' '}
          {stats.counties_covered} counties · {stats.turkana_exceptions} high-draw-in-priority flags
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total subsidies managed (est. annual)"
          value={`KSh ${stats.subsidyManaged.toLocaleString()}`}
          detail={`${stats.classification_counts.GREEN} GREEN households in the synthetic tariff model.`}
        />
        <StatCard
          label="Detected leakage (est. annual)"
          value={`KSh ${stats.leakageDetected.toLocaleString()}`}
          detail={`${stats.classification_counts.RED} RED accounts contributing cross-subsidy stress.`}
        />
        <div
          className={`rounded-xl border-2 p-0 overflow-hidden shadow-card ${
            revenuePositive ? 'border-tier-green' : 'border-tier-red'
          }`}
        >
          <StatCard
            label="Revenue balance"
            value={`KSh ${revenuePositive ? '+' : ''}${stats.revenueBalance.toLocaleString()}`}
            detail={
              revenuePositive
                ? 'Surplus versus modelled subsidy outflow — cross-subsidy appears positive.'
                : 'Deficit versus modelled subsidy outflow — review fee and discount levers.'
            }
          />
        </div>
        <StatCard
          label="National subsidy efficiency score"
          value={`${stats.efficiencyScore}%`}
          detail="Of every KSh 100 in subsidies, this share reaches households with genuinely high priority baseline signals in the cohort."
          variant="hero"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
        <KenyaCountyMap countyAgg={stats.countyAgg} />
        <div className="card flex flex-col min-h-[420px]">
          <div className="px-5 py-4 border-b border-border">
            <span className="text-sm font-semibold text-primary">Classification mix</span>
            <p className="text-xs text-muted mt-1">Donut shows exact GREEN / YELLOW / RED counts.</p>
          </div>
          <div className="p-4 flex flex-col md:flex-row items-center gap-4 flex-1">
            <div className="w-full md:w-1/2 h-[260px]">
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
            <div className="w-full md:w-1/2 flex flex-col gap-3">
              {donutData.map((d) => (
                <div key={d.key} className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2 text-muted">
                    <span className="w-3 h-3 rounded-full" style={{ background: COLORS[d.key] }} />
                    {d.name}
                  </span>
                  <span className="font-bold text-body tabular-nums">{d.value}</span>
                </div>
              ))}
              <div className="mt-2">
                <div className="text-xs font-semibold text-primary mb-2">Top 5 counties by modelled leakage</div>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leakageBars} layout="vertical" margin={{ left: 8, right: 8 }}>
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
            </div>
          </div>
        </div>
      </div>
    </PageFade>
  );
}

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function SignalBreakdown({ results }) {
  if (!results || results.length === 0) return null;

  const countyMap = new Map();
  results.forEach(r => {
    if (!countyMap.has(r.county)) {
      countyMap.set(r.county, {
        count: 0,
        geo: 0,
        token: 0,
        kwh: 0,
        loc: 0,
        load: 0,
      });
    }
    const c = countyMap.get(r.county);
    c.count += 1;
    c.geo += r.geographic_score;
    c.token += r.token_score;
    c.kwh += r.monthly_kwh_equity_score ?? 0;
    c.loc += r.location_equity_score ?? 0;
    c.load += r.consumption_score ?? 0;
  });

  const countyData = Array.from(countyMap.entries())
    .map(([county, d]) => ({
      county,
      geographic: Math.round(d.geo / d.count),
      token: Math.round(d.token / d.count),
      kwh: Math.round(d.kwh / d.count),
      loc: Math.round(d.loc / d.count),
      load: Math.round(d.load / d.count),
    }))
    .sort((a, b) => b.geographic - a.geographic)
    .slice(0, 10);

  const labels = countyData.map(d => d.county);

  const data = {
    labels,
    datasets: [
      { label: 'Poverty (Geo)', data: countyData.map(d => d.geographic), backgroundColor: '#00D4FF', barPercentage: 0.8, categoryPercentage: 0.85 },
      { label: 'Token', data: countyData.map(d => d.token), backgroundColor: '#2ECC71', barPercentage: 0.8, categoryPercentage: 0.85 },
      { label: 'kWh (V1)', data: countyData.map(d => d.kwh), backgroundColor: '#A78BFA', barPercentage: 0.8, categoryPercentage: 0.85 },
      { label: 'Location (V2)', data: countyData.map(d => d.loc), backgroundColor: '#FB923C', barPercentage: 0.8, categoryPercentage: 0.85 },
      { label: 'Load Profile', data: countyData.map(d => d.load), backgroundColor: '#F1C40F', barPercentage: 0.8, categoryPercentage: 0.85 },
    ],
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#94A3B8', boxWidth: 10, font: { family: 'Inter', size: 11 } }
      },
      tooltip: {
        backgroundColor: 'rgba(0,31,63,0.9)',
        titleColor: '#F1F5F9',
        bodyColor: '#CBD5E1',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
      },
    },
    scales: {
      x: {
        max: 100,
        grid: { color: 'rgba(255,255,255,0.05)', borderDash: [3,3] },
        ticks: { color: '#64748B', font: { size: 10, family: 'Inter' } }
      },
      y: {
        grid: { display: false },
        ticks: { color: '#CBD5E1', font: { size: 11, family: 'Inter', weight: '500' } }
      }
    },
    animation: { duration: 1000, easing: 'easeOutQuart' }
  };

  return (
    <div className="glass-window flex flex-col h-[500px]">
      <div className="px-5 py-4 border-b border-glass flex items-center justify-between">
        <span className="text-[13px] font-semibold text-slate-300 uppercase tracking-widest">Signal Breakdown by County</span>
        <span className="text-[11px] text-slate-500 hidden sm:inline-block">Top 10 counties · Poverty, Token, kWh (V1), Location (V2), Load</span>
      </div>
      <div className="p-4 flex-1 w-full relative">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}

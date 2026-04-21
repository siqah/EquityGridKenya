import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function ClassificationChart({ stats }) {
  if (!stats) return null;

  const counts = stats.classification_counts || {};
  const total = (counts.GREEN || 0) + (counts.YELLOW || 0) + (counts.RED || 0);

  const data = {
    labels: ['Subsidize (Green)', 'Standard (Yellow)', 'Luxury (Red)'],
    datasets: [
      {
        data: [counts.GREEN || 0, counts.YELLOW || 0, counts.RED || 0],
        backgroundColor: ['#2ECC71', '#F1C40F', '#E74C3C'],
        hoverBackgroundColor: ['#1A7A43', '#9A7D0A', '#922B21'],
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  };

  const options = {
    cutout: '62%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0,31,63,0.9)',
        titleColor: '#F1F5F9',
        bodyColor: '#CBD5E1',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: (context) => ` ${context.label}: ${context.raw} accounts`,
        },
      },
    },
    animation: {
      animateScale: true,
      animateRotate: true,
    },
  };

  return (
    <div className="glass-window flex flex-col h-full">
      <div className="px-5 py-4 border-b border-glass flex items-center justify-between">
        <span className="text-[13px] font-semibold text-slate-300 uppercase tracking-widest">Classification Distribution</span>
      </div>
      <div className="p-6 flex items-center gap-8 flex-1">
        
        {/* Chart Container */}
        <div className="relative w-[200px] h-[200px] flex-shrink-0">
          <Doughnut data={data} options={options} />
          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-1">
            <span className="text-3xl font-extrabold text-slate-100">{total}</span>
            <span className="text-[10px] font-semibold text-slate-400 tracking-[1.5px] uppercase mt-0.5">Accounts</span>
          </div>
        </div>

        {/* Legend Custom */}
        <div className="flex flex-col gap-3 flex-1">
          {[
            { key: 'GREEN', colorClass: 'bg-green-subsidy', label: 'Subsidize (Green)' },
            { key: 'YELLOW', colorClass: 'bg-yellow-standard', label: 'Standard (Yellow)' },
            { key: 'RED', colorClass: 'bg-red-luxury', label: 'Luxury / Anomaly (Red)' },
          ].map(item => (
            <div key={item.key} className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full shrink-0 ${item.colorClass}`}></span>
              <span className="text-sm text-slate-400 flex-1">{item.label}</span>
              <span className="text-base font-bold text-slate-200 font-mono">{counts[item.key] || 0}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

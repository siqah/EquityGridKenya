import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);

export default function ScoreDistribution({ results }) {
  if (!results || results.length === 0) return null;

  // Compute bins for 0-100 score ranges (step size of 5)
  const binCount = 20;
  const bins = Array(binCount).fill(0);
  
  results.forEach(r => {
    // Score exactly 100 goes to the last bin
    let idx = Math.floor(r.equity_score / 5);
    if (idx >= 20) idx = 19;
    bins[idx]++;
  });

  const getBarColor = (score) => {
    if (score >= 70) return '#2ECC71';
    if (score >= 40) return '#F1C40F';
    return '#E74C3C';
  };

  const colors = bins.map((_, i) => getBarColor(i * 5));

  const data = {
    labels: Array.from({ length: 20 }, (_, i) => `${i * 5}-${i * 5 + 4}`),
    datasets: [
      {
        data: bins,
        backgroundColor: colors,
        hoverBackgroundColor: colors.map(c => c),
        borderWidth: 0,
        borderRadius: 2,
        barPercentage: 1.0,
        categoryPercentage: 0.95,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0,31,63,0.9)',
        titleColor: '#F1F5F9',
        bodyColor: '#CBD5E1',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          title: (context) => `Score: ${context[0].label}`,
          label: (context) => `${context.raw} Accounts`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false, drawBorder: false },
        ticks: { color: '#64748B', font: { size: 10, family: 'Inter' } }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255,255,255,0.05)', borderDash: [3,3] },
        border: { display: false },
        ticks: { color: '#64748B', stepSize: 5, font: { size: 10, family: 'Inter' } }
      }
    },
    animation: {
      duration: 800,
      easing: 'easeOutQuart'
    }
  };

  return (
    <div className="glass-window flex flex-col h-full">
      <div className="px-5 py-4 border-b border-glass flex items-center justify-between">
        <span className="text-[13px] font-semibold text-slate-300 uppercase tracking-widest">Equity Score Distribution</span>
        <span className="text-[11px] text-slate-500">{results.length} accounts</span>
      </div>
      <div className="p-6 flex-1 w-full min-h-[260px] relative">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}

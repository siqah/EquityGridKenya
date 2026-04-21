export default function KPICard({ label, value, detail, colorClass, icon, delay = 0 }) {
  const borderColors = {
    green: 'before:bg-gradient-to-r before:from-green-subsidy before:to-green-subsidy-dim',
    yellow: 'before:bg-gradient-to-r before:from-yellow-standard before:to-yellow-standard-dim',
    red: 'before:bg-gradient-to-r before:from-red-luxury before:to-red-luxury-dim',
    cyan: 'before:bg-gradient-to-r before:from-cyan-accent before:to-navy-500',
  };

  const textColors = {
    green: 'text-green-subsidy',
    yellow: 'text-yellow-standard',
    red: 'text-red-luxury',
    cyan: 'text-cyan-accent',
  };

  return (
    <div className={`glass-window relative p-6 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:rounded-t-2xl ${borderColors[colorClass] || ''}`} style={{ animation: `fadeIn 0.5s ease-out ${delay * 0.1}s both` }}>
      <div className="text-[11.5px] font-semibold text-slate-400 uppercase tracking-[1.2px] mb-2.5">{label}</div>
      <div className={`text-[32px] font-extrabold tracking-tight leading-[1.1] mb-2 ${textColors[colorClass] || 'text-slate-50'}`}>{value}</div>
      <div className="text-xs text-slate-500 font-normal">{detail}</div>
      <div className="absolute top-5 right-5 text-[28px] opacity-30">{icon}</div>
    </div>
  );
}

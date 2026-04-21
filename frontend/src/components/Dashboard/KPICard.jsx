export default function KPICard({ label, value, detail, colorClass, icon, delay = 0 }) {
  return (
    <div className={`glass-card kpi-card ${colorClass} fade-in fade-in-delay-${delay}`}>
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${colorClass}`}>{value}</div>
      <div className="kpi-detail">{detail}</div>
      <div className="kpi-icon">{icon}</div>
    </div>
  );
}

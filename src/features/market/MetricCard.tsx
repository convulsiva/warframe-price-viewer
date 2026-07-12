type MetricCardProps = {
  label: string;
  value: string;
  tone?: "cyan" | "gold" | "muted";
};

export function MetricCard({ label, value, tone = "cyan" }: MetricCardProps) {
  return (
    <div className={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

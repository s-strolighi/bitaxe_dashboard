type KpiCardProps = {
  label: string;
  value: string;
  tone?: "default" | "good" | "warn";
};

export function KpiCard({ label, value, tone = "default" }: KpiCardProps) {
  return (
    <article className={`kpi-card kpi-${tone}`}>
      <p>{label}</p>
      <h3>{value}</h3>
    </article>
  );
}

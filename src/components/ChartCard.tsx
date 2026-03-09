import type { ReactNode } from "react";

type ChartCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function ChartCard({ title, subtitle, children }: ChartCardProps) {
  return (
    <section className="chart-card">
      <header>
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </header>
      <div className="chart-body">{children}</div>
    </section>
  );
}

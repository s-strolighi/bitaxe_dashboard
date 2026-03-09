import type { ReactNode } from "react";

type ChartCardProps = {
  title: string;
  subtitle?: string;
  className?: string;
  children: ReactNode;
};

export function ChartCard({
  title,
  subtitle,
  className,
  children
}: ChartCardProps) {
  return (
    <section className={`chart-card ${className ?? ""}`.trim()}>
      <header>
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </header>
      <div className="chart-body">{children}</div>
    </section>
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { ChartCard } from "./components/ChartCard";
import { KpiCard } from "./components/KpiCard";
import { RangeSelector } from "./components/RangeSelector";
import { TelemetryTable } from "./components/TelemetryTable";
import { calculateStats, filterByRange, formatNumber } from "./lib/metrics";
import { loadTelemetry } from "./services/telemetryRepository";
import type { TelemetryPoint, TimeRange } from "./types";

function App() {
  const [rawTelemetry, setRawTelemetry] = useState<TelemetryPoint[]>([]);
  const [range, setRange] = useState<TimeRange>("24h");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function run() {
      const telemetry = await loadTelemetry();
      setRawTelemetry(telemetry);
      setLoading(false);
    }

    void run();
  }, []);

  const telemetry = useMemo(
    () => filterByRange(rawTelemetry, range),
    [rawTelemetry, range]
  );
  const stats = useMemo(() => calculateStats(telemetry), [telemetry]);

  if (loading) {
    return (
      <main className="app-shell">
        <p>Caricamento dati dashboard...</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>Bitaxe Analytics Dashboard</h1>
          <p>Monitoraggio operativo con metriche live e storiche</p>
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </header>

      <section className="kpi-grid">
        <KpiCard
          label="Best hashrate"
          value={`${formatNumber(stats.bestHashrate)} GH/s`}
          tone="good"
        />
        <KpiCard
          label="Hashrate medio"
          value={`${formatNumber(stats.avgHashrate)} GH/s`}
        />
        <KpiCard
          label="Temperatura min/max"
          value={`${formatNumber(stats.minTemp)} / ${formatNumber(stats.maxTemp)} °C`}
          tone={stats.maxTemp >= 75 ? "warn" : "default"}
        />
        <KpiCard
          label="Potenza media"
          value={`${formatNumber(stats.avgPower)} W`}
        />
        <KpiCard
          label="Efficienza media"
          value={`${formatNumber(stats.estimatedEfficiency, 3)} GH/W`}
        />
        <KpiCard
          label="Share reject rate"
          value={`${formatNumber(stats.rejectionRatePct)} %`}
          tone={stats.rejectionRatePct > 2 ? "warn" : "default"}
        />
      </section>

      <section className="charts-grid">
        <ChartCard
          title="Trend Hashrate vs Temperatura"
          subtitle="Confronto andamento nelle ultime rilevazioni"
        >
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={telemetry}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2f3546" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value: number) =>
                  new Date(value).toLocaleTimeString("it-IT", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })
                }
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip
                labelFormatter={(value: number) =>
                  new Date(value).toLocaleString("it-IT")
                }
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="hashrateGh"
                name="Hashrate GH/s"
                stroke="#25c2a0"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="temperatureC"
                name="Temperatura °C"
                stroke="#ff8a48"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Consumo e ventilazione"
          subtitle="Potenza assorbita e intensita ventola"
        >
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={telemetry}>
              <defs>
                <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5cc8ff" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#5cc8ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2f3546" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value: number) =>
                  new Date(value).toLocaleTimeString("it-IT", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })
                }
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value: number) =>
                  new Date(value).toLocaleString("it-IT")
                }
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="powerW"
                name="Potenza W"
                stroke="#5cc8ff"
                fill="url(#colorPower)"
              />
              <Line
                type="monotone"
                dataKey="fanPercent"
                name="Ventola %"
                stroke="#ffd166"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Shares accettate/rifiutate" subtitle="Per campione">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={telemetry.slice(-40)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2f3546" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value: number) =>
                  new Date(value).toLocaleTimeString("it-IT", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })
                }
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value: number) =>
                  new Date(value).toLocaleString("it-IT")
                }
              />
              <Legend />
              <Bar dataKey="acceptedShares" name="Accettate" fill="#25c2a0" />
              <Bar dataKey="rejectedShares" name="Rifiutate" fill="#ff5f5f" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <TelemetryTable telemetry={telemetry} />

      <footer className="footer-note">
        <p>
          Campioni analizzati: <strong>{stats.totalSamples}</strong>
        </p>
      </footer>
    </main>
  );
}

export default App;

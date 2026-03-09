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
  const [dataSource, setDataSource] = useState<"firebase" | "mock">("mock");

  useEffect(() => {
    async function run() {
      const { points, source } = await loadTelemetry();
      setRawTelemetry(points);
      setDataSource(source);
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
          <p>
            Fonte dati: <strong>{dataSource === "firebase" ? "Firebase" : "Mock"}</strong>
          </p>
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </header>

      <section className="kpi-grid">
        <KpiCard
          label="Best hashrate"
          value={`${formatNumber(stats.bestHashrate, 2)} GH/s`}
          tone="good"
        />
        <KpiCard
          label="Hashrate medio"
          value={`${formatNumber(stats.avgHashrate, 2)} GH/s`}
        />
        <KpiCard
          label="Temp chip min/max"
          value={`${formatNumber(stats.minTempChip, 1)} / ${formatNumber(stats.maxTempChip, 1)} degC`}
          tone={stats.maxTempChip >= 75 ? "warn" : "default"}
        />
        <KpiCard
          label="Temp VR min/max"
          value={`${formatNumber(stats.minTempVr, 1)} / ${formatNumber(stats.maxTempVr, 1)} degC`}
          tone={stats.maxTempVr >= 85 ? "warn" : "default"}
        />
        <KpiCard
          label="Potenza media"
          value={`${formatNumber(stats.avgPower, 1)} W`}
        />
        <KpiCard
          label="Efficienza media"
          value={`${formatNumber(stats.estimatedEfficiency, 1)} W/TH`}
        />
        <KpiCard
          label="Share reject rate"
          value={`${formatNumber(stats.rejectionRatePct)} %`}
          tone={stats.rejectionRatePct > 2 ? "warn" : "default"}
        />
        <KpiCard label="Shares totali" value={`${stats.totalShares}`} />
      </section>

      <section className="charts-grid">
        <ChartCard title="Hashrate vs Temperature" subtitle="Chip e VR confrontate nel tempo">
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
                dataKey="tempChipC"
                name="Temp chip degC"
                stroke="#ff8a48"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="tempVrC"
                name="Temp VR degC"
                stroke="#ffcc66"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Potenza e efficienza"
          subtitle="Confronto diretto tra consumo e resa"
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
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip
                labelFormatter={(value: number) =>
                  new Date(value).toLocaleString("it-IT")
                }
              />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="powerW"
                name="Potenza W"
                stroke="#5cc8ff"
                fill="url(#colorPower)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="efficiencyWTh"
                name="Efficienza W/TH"
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

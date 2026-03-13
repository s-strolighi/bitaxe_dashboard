import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { ChartCard } from "./components/ChartCard";
import { KpiCard } from "./components/KpiCard";
import { RangeSelector } from "./components/RangeSelector";
import { EventsTable } from "./components/EventsTable";
import { TelemetryTable } from "./components/TelemetryTable";
import {
  buildChartPoints,
  calculateStats,
  filterByRange,
  formatCompactNumber,
  formatNumber,
  formatTimestamp
} from "./lib/metrics";
import { loadTelemetry } from "./services/telemetryRepository";
import type { TelemetryPoint, TimeRange } from "./types";

function App() {
  const EventUpMarker = (props: unknown): JSX.Element => {
    if (typeof props !== "object" || props === null) return <g />;
    const { cx, cy, fill } = props as { cx?: number; cy?: number; fill?: string };
    if (cx === undefined || cy === undefined) return <g />;
    const size = 8;
    const path = `M 0 ${-size} L ${-size} ${size} L ${size} ${size} Z`;
    return (
      <g transform={`translate(${cx},${cy})`}>
        <path d={path} fill={fill ?? "#7ef7ac"} stroke="#0b121f" strokeWidth={1.5} />
      </g>
    );
  };

  const EventDownMarker = (props: unknown): JSX.Element => {
    if (typeof props !== "object" || props === null) return <g />;
    const { cx, cy, fill } = props as { cx?: number; cy?: number; fill?: string };
    if (cx === undefined || cy === undefined) return <g />;
    const size = 8;
    const path = `M 0 ${size} L ${-size} ${-size} L ${size} ${-size} Z`;
    return (
      <g transform={`translate(${cx},${cy})`}>
        <path d={path} fill={fill ?? "#ff8a48"} stroke="#0b121f" strokeWidth={1.5} />
      </g>
    );
  };
    if (cx === undefined || cy === undefined) return <g />;
    const size = 7;
    const path = `M ${cx - size} ${cy - size} L ${cx + size} ${cy - size} L ${cx} ${cy + size} Z`;
    return <path d={path} fill={fill ? "#ff8a48"} stroke="#0b121f" strokeWidth={1} />;
  };

  const [rawTelemetry, setRawTelemetry] = useState<TelemetryPoint[]>([]);
  const [range, setRange] = useState<TimeRange>("1d");
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<"firebase" | "mock">("mock");
  const [sourceInfo, setSourceInfo] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<{
    collection: string;
    database: string;
    docCount: number;
    sampleCount: number;
    validCount: number;
    dayIds: string[];
  } | null>(null);

  useEffect(() => {
    async function run() {
      const { points, source, info, debug } = await loadTelemetry();
      setRawTelemetry(points);
      setDataSource(source);
      setSourceInfo(info ? null);
      setDebugInfo(debug ? null);
      setLoading(false);
    }

    void run();
  }, []);

  const telemetry = useMemo(
    () => filterByRange(rawTelemetry, range),
    [rawTelemetry, range]
  );
  const telemetryForCharts = useMemo(() => buildChartPoints(telemetry), [telemetry]);
  const eventUpPoints = useMemo(
    () => telemetryForCharts.filter((point) => point.event === "tuning_up"),
    [telemetryForCharts]
  );
  const eventDownPoints = useMemo(
    () => telemetryForCharts.filter((point) => point.event === "tuning_down"),
    [telemetryForCharts]
  );
  const totalTuningEvents = eventUpPoints.length + eventDownPoints.length;
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
          <div className="brand-row">
            <img src={`${import.meta.env.BASE_URL}branding/logo-square.png`} alt="Bitaxe logo" className="brand-square" />
            <img src={`${import.meta.env.BASE_URL}branding/logo-round.png`} alt="Bitaxe logo" className="brand-round" />
          </div>
          <h1>Bitaxe Analytics Dashboard</h1>
          <p>Monitoraggio operativo con metriche live e storiche</p>
          <p>
            Fonte dati: <strong>{dataSource === "firebase" ? "Firebase" : "Mock"}</strong>
          </p>
          {sourceInfo ? <p>Stato sorgente: {sourceInfo}</p> : null}
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </header>

      <section className="hero-grid">
        <article className={`hero-kpi ${stats.blocksFound > 0 ? "hero-hit" : ""}`}>
          <p>Blocchi minati</p>
          <h2>{stats.blocksFound}</h2>
        </article>
      </section>

      <section className="kpi-groups">
        <div className="kpi-group">
          <KpiCard
            label="Best hashrate"
            value={`${formatNumber(stats.bestHashrate / 1000, 2)} TH/s`}
            tone="hash"
          />
          <KpiCard
            label="Hashrate medio"
            value={`${formatNumber(stats.avgHashrate / 1000, 2)} TH/s`}
            tone="hash"
          />
          <KpiCard
            label="Share reject rate"
            value={`${formatNumber(stats.rejectionRatePct)} %`}
            tone={stats.rejectionRatePct > 2 ? "warn" : "default"}
          />
          <KpiCard label="Shares totali" value={formatCompactNumber(stats.totalShares)} />
        </div>
        <div className="kpi-group">
          <KpiCard
            label="Temp chip min"
            value={`${formatNumber(stats.minTempChip, 1)} °C`}
            tone="cool"
          />
          <KpiCard
            label="Temp chip max"
            value={`${formatNumber(stats.maxTempChip, 1)} °C`}
            tone="warm"
          />
          <KpiCard
            label="Potenza media"
            value={`${formatNumber(stats.avgPower, 1)} W`}
            tone="energy"
          />
          <KpiCard
            label="Efficienza media"
            value={`${formatNumber(stats.estimatedEfficiency, 1)} W/TH`}
            tone="energy"
          />
        </div>
        <div className="kpi-group">
          <KpiCard
            label="Temp VR min"
            value={`${formatNumber(stats.minTempVr, 1)} °C`}
            tone="cool"
          />
          <KpiCard
            label="Temp VR max"
            value={`${formatNumber(stats.maxTempVr, 1)} °C`}
            tone="warm"
          />
          {stats.minAmbientTemp !== null ? (
            <KpiCard
              label="Temp esterna min"
              value={`${formatNumber(stats.minAmbientTemp, 1)} °C`}
              tone="cool"
            />
          ) : null}
          {stats.maxAmbientTemp !== null ? (
            <KpiCard
              label="Temp esterna max"
              value={`${formatNumber(stats.maxAmbientTemp, 1)} °C`}
              tone="warm"
            />
          ) : null}
        </div>
      </section>

      <section className="charts-grid">
        <ChartCard
          className="chart-card-wide"
          title="Hashrate vs Temperature"
          subtitle={`Serie aggregate per migliore leggibilita · Eventi tuning: ${totalTuningEvents}`}
        >
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={telemetryForCharts}>
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
              <YAxis
                yAxisId="left"
                domain={[(value: number) => value * 0.98, (value: number) => value * 1.02]}
                tickFormatter={(value: number) => formatNumber(value, 2)}
                label={{ value: "TH/s", angle: -90, position: "insideLeft" }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[(value: number) => value - 1.5, (value: number) => value + 1.5]}
                tickFormatter={(value: number) => formatNumber(value, 1)}
                label={{ value: "°C", angle: 90, position: "insideRight" }}
              />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #2e3a52", color: "#eaf0ff" }}
                labelStyle={{ color: "#d4def5" }}
                labelFormatter={(value: number) => formatTimestamp(value)}
                formatter={(value: number, name: string) => {
                  if (name.includes("Hashrate")) return [formatNumber(value, 2), name];
                  return [formatNumber(value, 1), name];
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="hashrateTh"
                name="Hashrate TH/s"
                stroke="#25c2a0"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="tempChipC"
                name="Temp chip °C"
                stroke="#ff8a48"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="tempVrC"
                name="Temp VR °C"
                stroke="#ffcc66"
                strokeWidth={2}
                dot={false}
              />
              <Scatter
                yAxisId="left"
                data={eventUpPoints}
                dataKey="hashrateTh"
                name="Tuning up"
                fill="#7ef7ac"
                shape={EventUpMarker}
              />
              <Scatter
                yAxisId="left"
                data={eventDownPoints}
                dataKey="hashrateTh"
                name="Tuning down"
                fill="#ff8a48"
                shape={EventDownMarker}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Potenza e efficienza"
          subtitle={`Confronto diretto tra consumo e resa · Eventi tuning: ${totalTuningEvents}`}
        >
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={telemetryForCharts}>
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
              <YAxis
                yAxisId="left"
                domain={[(value: number) => value * 0.98, (value: number) => value * 1.02]}
                tickFormatter={(value: number) => formatNumber(value, 1)}
                label={{ value: "W", angle: -90, position: "insideLeft" }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[(value: number) => value * 0.98, (value: number) => value * 1.02]}
                tickFormatter={(value: number) => formatNumber(value, 1)}
                label={{ value: "W/TH", angle: 90, position: "insideRight" }}
              />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #2e3a52", color: "#eaf0ff" }}
                labelStyle={{ color: "#d4def5" }}
                labelFormatter={(value: number) => formatTimestamp(value)}
                formatter={(value: number, name: string) => [formatNumber(value, 1), name]}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="powerW"
                name="Potenza W"
                stroke="#5cc8ff"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="efficiencyWPerTH"
                name="Efficienza W/TH"
                stroke="#ffd166"
                strokeWidth={2}
                dot={false}
              />
              <Scatter
                yAxisId="left"
                data={eventUpPoints}
                dataKey="powerW"
                name="Tuning up"
                fill="#7ef7ac"
                shape={EventUpMarker}
              />
              <Scatter
                yAxisId="left"
                data={eventDownPoints}
                dataKey="powerW"
                name="Tuning down"
                fill="#ff8a48"
                shape={EventDownMarker}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Temperature"
          subtitle={`Esterna, chip e VR · Eventi tuning: ${totalTuningEvents}`}
        >
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={telemetryForCharts}>
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
              <YAxis
                tickFormatter={(value: number) => formatNumber(value, 1)}
                label={{ value: "°C", angle: -90, position: "insideLeft" }}
              />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #2e3a52", color: "#eaf0ff" }}
                labelStyle={{ color: "#d4def5" }}
                labelFormatter={(value: number) => formatTimestamp(value)}
                formatter={(value: number, name: string) => [formatNumber(value, 1), name]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="ambientTempC"
                name="Temp esterna °C"
                stroke="#7aa2ff"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="tempChipC"
                name="Temp chip °C"
                stroke="#ff8a48"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="tempVrC"
                name="Temp VR °C"
                stroke="#ffcc66"
                strokeWidth={2}
                dot={false}
              />
              <Scatter
                data={eventUpPoints}
                dataKey="tempChipC"
                name="Tuning up"
                fill="#7ef7ac"
                shape={EventUpMarker}
              />
              <Scatter
                data={eventDownPoints}
                dataKey="tempChipC"
                name="Tuning down"
                fill="#ff8a48"
                shape={EventDownMarker}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          className="chart-card-wide"
          title="Hashrate e temperatura esterna"
          subtitle={`Hashrate, temp esterna e temp chip · Eventi tuning: ${totalTuningEvents}`}
        >
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={telemetryForCharts}>
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
              <YAxis
                yAxisId="left"
                domain={[(value: number) => value * 0.98, (value: number) => value * 1.02]}
                tickFormatter={(value: number) => formatNumber(value, 2)}
                label={{ value: "TH/s", angle: -90, position: "insideLeft" }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[(value: number) => value - 1.5, (value: number) => value + 1.5]}
                tickFormatter={(value: number) => formatNumber(value, 1)}
                label={{ value: "°C", angle: 90, position: "insideRight" }}
              />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #2e3a52", color: "#eaf0ff" }}
                labelStyle={{ color: "#d4def5" }}
                labelFormatter={(value: number) => formatTimestamp(value)}
                formatter={(value: number, name: string) => {
                  if (name.includes("Hashrate")) return [formatNumber(value, 2), name];
                  return [formatNumber(value, 1), name];
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="hashrateTh"
                name="Hashrate TH/s"
                stroke="#25c2a0"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="ambientTempC"
                name="Temp esterna °C"
                stroke="#7aa2ff"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="tempChipC"
                name="Temp chip °C"
                stroke="#ff8a48"
                strokeWidth={2}
                dot={false}
              />
              <Scatter
                yAxisId="left"
                data={eventUpPoints}
                dataKey="hashrateTh"
                name="Tuning up"
                fill="#7ef7ac"
                shape={EventUpMarker}
              />
              <Scatter
                yAxisId="left"
                data={eventDownPoints}
                dataKey="hashrateTh"
                name="Tuning down"
                fill="#ff8a48"
                shape={EventDownMarker}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Efficienza e temperatura esterna"
          subtitle={`W/TH vs °C · Eventi tuning: ${totalTuningEvents}`}
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={telemetryForCharts}>
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
              <YAxis
                yAxisId="left"
                domain={[(value: number) => value * 0.98, (value: number) => value * 1.02]}
                tickFormatter={(value: number) => formatNumber(value, 1)}
                label={{ value: "W/TH", angle: -90, position: "insideLeft" }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[(value: number) => value - 1, (value: number) => value + 1]}
                tickFormatter={(value: number) => formatNumber(value, 1)}
                label={{ value: "°C", angle: 90, position: "insideRight" }}
              />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #2e3a52", color: "#eaf0ff" }}
                labelStyle={{ color: "#d4def5" }}
                labelFormatter={(value: number) => formatTimestamp(value)}
                formatter={(value: number, name: string) => [formatNumber(value, 1), name]}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="efficiencyWPerTH"
                name="Efficienza W/TH"
                stroke="#ffd166"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="ambientTempC"
                name="Temp esterna °C"
                stroke="#7aa2ff"
                strokeWidth={2}
                dot={false}
              />
              <Scatter
                yAxisId="left"
                data={eventUpPoints}
                dataKey="efficiencyWPerTH"
                name="Tuning up"
                fill="#7ef7ac"
                shape={EventUpMarker}
              />
              <Scatter
                yAxisId="left"
                data={eventDownPoints}
                dataKey="efficiencyWPerTH"
                name="Tuning down"
                fill="#ff8a48"
                shape={EventDownMarker}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Efficienza e delta temperatura"
          subtitle={`Delta temp = max(Temp chip/VR) - Temp esterna ? Eventi tuning: ${totalTuningEvents}`}
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={telemetryForCharts}>
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
              <YAxis
                yAxisId="left"
                domain={[(value: number) => value * 0.98, (value: number) => value * 1.02]}
                tickFormatter={(value: number) => formatNumber(value, 1)}
                label={{ value: "W/TH", angle: -90, position: "insideLeft" }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[(value: number) => value - 2, (value: number) => value + 2]}
                tickFormatter={(value: number) => formatNumber(value, 1)}
                label={{ value: "? ?C", angle: 90, position: "insideRight" }}
              />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #2e3a52", color: "#eaf0ff" }}
                labelStyle={{ color: "#d4def5" }}
                labelFormatter={(value: number) => formatTimestamp(value)}
                formatter={(value: number, name: string) => [formatNumber(value, 1), name]}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="efficiencyWPerTH"
                name="Efficienza W/TH"
                stroke="#ffd166"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="deltaTempC"
                name="Delta temp ?C"
                stroke="#9ad0ff"
                strokeWidth={2}
                dot={false}
              />
              <Scatter
                yAxisId="left"
                data={eventUpPoints}
                dataKey="efficiencyWPerTH"
                name="Tuning up"
                fill="#7ef7ac"
                shape={EventUpMarker}
              />
              <Scatter
                yAxisId="left"
                data={eventDownPoints}
                dataKey="efficiencyWPerTH"
                name="Tuning down"
                fill="#ff8a48"
                shape={EventDownMarker}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <TelemetryTable telemetry={telemetry} />
      <EventsTable telemetry={telemetry} />

      <footer className="footer-note">
        <p>
          Campioni analizzati: <strong>{stats.totalSamples}</strong>
        </p>
        <p>
          Giorni analizzati: <strong>{debugInfo ? debugInfo.docCount : 0}</strong>
        </p>
        <p>
          Eventi di tuning analizzati: <strong>{totalTuningEvents}</strong>
        </p>
      </footer>
    </main>
  );
}

export default App;

import type { DashboardStats, TelemetryPoint, TimeRange } from "../types";

function safeAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, current) => sum + current, 0) / values.length;
}

export function filterByRange(
  telemetry: TelemetryPoint[],
  range: TimeRange
): TelemetryPoint[] {
  if (range === "all" || telemetry.length === 0) return telemetry;

  const now = telemetry[telemetry.length - 1].timestamp;
  const rangeMsMap: Record<Exclude<TimeRange, "all">, number> = {
    "6h": 6 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000
  };

  const minTimestamp = now - rangeMsMap[range];
  return telemetry.filter((point) => point.timestamp >= minTimestamp);
}

export function calculateStats(telemetry: TelemetryPoint[]): DashboardStats {
  if (telemetry.length === 0) {
    return {
      totalSamples: 0,
      bestHashrate: 0,
      avgHashrate: 0,
      minTemp: 0,
      maxTemp: 0,
      avgTemp: 0,
      avgPower: 0,
      estimatedEfficiency: 0,
      rejectionRatePct: 0
    };
  }

  const hashrates = telemetry.map((point) => point.hashrateGh);
  const temps = telemetry.map((point) => point.temperatureC);
  const powers = telemetry.map((point) => point.powerW);
  const totalAccepted = telemetry.reduce(
    (acc, point) => acc + point.acceptedShares,
    0
  );
  const totalRejected = telemetry.reduce(
    (acc, point) => acc + point.rejectedShares,
    0
  );
  const totalShares = totalAccepted + totalRejected;

  const avgHashrate = safeAverage(hashrates);
  const avgPower = safeAverage(powers);

  return {
    totalSamples: telemetry.length,
    bestHashrate: Math.max(...hashrates),
    avgHashrate,
    minTemp: Math.min(...temps),
    maxTemp: Math.max(...temps),
    avgTemp: safeAverage(temps),
    avgPower,
    estimatedEfficiency: avgPower > 0 ? avgHashrate / avgPower : 0,
    rejectionRatePct: totalShares > 0 ? (totalRejected / totalShares) * 100 : 0
  };
}

export function formatNumber(value: number, digits = 2): string {
  return value.toFixed(digits);
}

export function formatTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

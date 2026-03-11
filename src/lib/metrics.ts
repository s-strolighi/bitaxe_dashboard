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
    "1h": 1 * 60 * 60 * 1000,
    "3h": 3 * 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
    "3d": 3 * 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "15d": 15 * 24 * 60 * 60 * 1000,
    "1mo": 30 * 24 * 60 * 60 * 1000,
    "3mo": 90 * 24 * 60 * 60 * 1000,
    "6mo": 180 * 24 * 60 * 60 * 1000,
    "1y": 365 * 24 * 60 * 60 * 1000
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
      minTempChip: 0,
      maxTempChip: 0,
      avgTempChip: 0,
      minTempVr: 0,
      maxTempVr: 0,
      avgTempVr: 0,
      minAmbientTemp: null,
      maxAmbientTemp: null,
      avgPower: 0,
      estimatedEfficiency: 0,
      rejectionRatePct: 0,
      totalShares: 0,
      blocksFound: 0
    };
  }

  const hashrates = telemetry.map((point) => point.hashrateGh);
  const chipTemps = telemetry.map((point) => point.tempChipC);
  const vrTemps = telemetry.map((point) => point.tempVrC);
  const ambientTemps = telemetry
    .map((point) => point.ambientTempC)
    .filter((value): value is number => value !== null);
  const powers = telemetry.map((point) => point.powerW);
  const efficiencies = telemetry.map((point) => point.efficiencyWPerTH);
  const lastSample = telemetry[telemetry.length - 1];
  const totalShares = lastSample ? lastSample.sharesTotal : 0;
  const totalRejected = lastSample ? lastSample.sharesRejected : 0;
  const blocksFound = Math.max(...telemetry.map((point) => point.blockFound));

  const avgHashrate = safeAverage(hashrates);
  const avgPower = safeAverage(powers);

  return {
    totalSamples: telemetry.length,
    bestHashrate: Math.max(...hashrates),
    avgHashrate,
    minTempChip: Math.min(...chipTemps),
    maxTempChip: Math.max(...chipTemps),
    avgTempChip: safeAverage(chipTemps),
    minTempVr: Math.min(...vrTemps),
    maxTempVr: Math.max(...vrTemps),
    avgTempVr: safeAverage(vrTemps),
    minAmbientTemp:
      ambientTemps.length > 0 ? Math.min(...ambientTemps) : null,
    maxAmbientTemp:
      ambientTemps.length > 0 ? Math.max(...ambientTemps) : null,
    avgPower,
    estimatedEfficiency: safeAverage(efficiencies),
    rejectionRatePct: totalShares > 0 ? (totalRejected / totalShares) * 100 : 0,
    totalShares,
    blocksFound
  };
}

export function formatNumber(value: number, digits = 2): string {
  return value.toFixed(digits);
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("it-IT", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

export function formatTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

export type ChartPoint = TelemetryPoint & {
  hashrateTh: number;
  efficiencyCalcWPerTH: number;
  efficiencyWPerTH: number;
  acceptedSharesDelta: number;
  rejectedSharesDelta: number;
};

export function buildChartPoints(telemetry: TelemetryPoint[]): ChartPoint[] {
  return telemetry.map((point, index, list) => {
    const prev = list[index - 1];
    return {
      ...point,
      hashrateTh: point.hashrateGh / 1000,
      efficiencyCalcWPerTH:
        point.hashrateGh > 0 ? (point.powerW * 1000) / point.hashrateGh : 0,
      efficiencyWPerTH:
        Number.isFinite(point.efficiencyWPerTH) && point.efficiencyWPerTH > 0
          ? point.efficiencyWPerTH
          : point.hashrateGh > 0
            ? (point.powerW * 1000) / point.hashrateGh
            : 0,
      acceptedSharesDelta: prev
        ? Math.max(0, point.sharesTotal - prev.sharesTotal)
        : 0,
      rejectedSharesDelta: prev
        ? Math.max(0, point.sharesRejected - prev.sharesRejected)
        : 0
    };
  });
}

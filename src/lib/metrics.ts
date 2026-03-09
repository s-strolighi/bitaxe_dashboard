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
      minTempChip: 0,
      maxTempChip: 0,
      avgTempChip: 0,
      minTempVr: 0,
      maxTempVr: 0,
      avgTempVr: 0,
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
  const powers = telemetry.map((point) => point.powerW);
  const efficiencies = telemetry.map((point) => point.efficiencyWTh);
  const totalAccepted = telemetry.reduce(
    (acc, point) => acc + point.acceptedShares,
    0
  );
  const totalRejected = telemetry.reduce(
    (acc, point) => acc + point.rejectedShares,
    0
  );
  const totalShares = totalAccepted + totalRejected;
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

export type AggregatedChartPoint = TelemetryPoint & {
  hashrateTh: number;
  efficiencyCalcWTh: number;
  acceptedSharesDelta: number;
  rejectedSharesDelta: number;
};

export function buildChartPoints(
  telemetry: TelemetryPoint[],
  maxPoints = 84
): AggregatedChartPoint[] {
  if (telemetry.length <= maxPoints) {
    return telemetry.map((point, index, list) => {
      const prev = list[index - 1];
      return {
        ...point,
        hashrateTh: point.hashrateGh / 1000,
        efficiencyCalcWTh:
          point.hashrateGh > 0 ? (point.powerW * 1000) / point.hashrateGh : 0,
        acceptedSharesDelta: prev
          ? Math.max(0, point.acceptedShares - prev.acceptedShares)
          : 0,
        rejectedSharesDelta: prev
          ? Math.max(0, point.rejectedShares - prev.rejectedShares)
          : 0
      };
    });
  }

  const bucketSize = Math.ceil(telemetry.length / maxPoints);
  const output: AggregatedChartPoint[] = [];

  for (let i = 0; i < telemetry.length; i += bucketSize) {
    const bucket = telemetry.slice(i, i + bucketSize);
    const first = bucket[0];
    const last = bucket[bucket.length - 1];
    const hashrateGh = safeAverage(bucket.map((point) => point.hashrateGh));
    const tempChipC = safeAverage(bucket.map((point) => point.tempChipC));
    const tempVrC = safeAverage(bucket.map((point) => point.tempVrC));
    const powerW = safeAverage(bucket.map((point) => point.powerW));
    const efficiencyWTh =
      safeAverage(bucket.map((point) => point.efficiencyWTh)) ||
      (hashrateGh > 0 ? (powerW * 1000) / hashrateGh : 0);
    const fanPercent = Math.round(safeAverage(bucket.map((point) => point.fanPercent)));
    const blockFound = Math.max(...bucket.map((point) => point.blockFound));

    output.push({
      timestamp: last.timestamp,
      hashrateGh,
      hashrateTh: hashrateGh / 1000,
      efficiencyCalcWTh: hashrateGh > 0 ? (powerW * 1000) / hashrateGh : 0,
      tempChipC,
      tempVrC,
      powerW,
      efficiencyWTh,
      fanPercent,
      blockFound,
      acceptedShares: last.acceptedShares,
      rejectedShares: last.rejectedShares,
      acceptedSharesDelta: Math.max(0, last.acceptedShares - first.acceptedShares),
      rejectedSharesDelta: Math.max(0, last.rejectedShares - first.rejectedShares)
    });
  }

  return output;
}

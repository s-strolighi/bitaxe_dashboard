export type TelemetryPoint = {
  timestamp: number;
  hashrateGh: number;
  tempChipC: number;
  tempVrC: number;
  ambientTempC: number | null;
  ambientHumidityPct: number | null;
  powerW: number;
  efficiencyWPerTH: number;
  blockFound: number;
  fanPercent: number;
  sharesTotal: number;
  sharesRejected: number;
  event: "tuning_up" | "tuning_down" | null;
};

export type DashboardStats = {
  totalSamples: number;
  bestHashrate: number;
  avgHashrate: number;
  minTempChip: number;
  maxTempChip: number;
  avgTempChip: number;
  minTempVr: number;
  maxTempVr: number;
  avgTempVr: number;
  minAmbientTemp: number | null;
  maxAmbientTemp: number | null;
  avgPower: number;
  estimatedEfficiency: number;
  rejectionRatePct: number;
  totalShares: number;
  blocksFound: number;
};

export type TimeRange =
  | "1h"
  | "3h"
  | "6h"
  | "1d"
  | "3d"
  | "7d"
  | "15d"
  | "1mo"
  | "3mo"
  | "6mo"
  | "1y"
  | "all";

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
  acceptedShares: number;
  rejectedShares: number;
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

export type TimeRange = "6h" | "24h" | "7d" | "30d" | "all";

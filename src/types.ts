export type TelemetryPoint = {
  timestamp: number;
  hashrateGh: number;
  temperatureC: number;
  powerW: number;
  fanPercent: number;
  acceptedShares: number;
  rejectedShares: number;
};

export type DashboardStats = {
  totalSamples: number;
  bestHashrate: number;
  avgHashrate: number;
  minTemp: number;
  maxTemp: number;
  avgTemp: number;
  avgPower: number;
  estimatedEfficiency: number;
  rejectionRatePct: number;
};

export type TimeRange = "6h" | "24h" | "7d" | "30d" | "all";

import type { TelemetryPoint } from "../types";

const now = Date.now();
const points = 240;
const stepMs = 15 * 60 * 1000;

export const mockTelemetry: TelemetryPoint[] = Array.from(
  { length: points },
  (_, index) => {
    const timestamp = now - (points - index) * stepMs;
    const wave = Math.sin(index / 12);
    const hashrateGh = Number((490 + wave * 45 + Math.random() * 18).toFixed(2));
    const temperatureC = Number((58 + wave * 6 + Math.random() * 4).toFixed(2));
    const powerW = Number((13 + wave * 1.2 + Math.random() * 0.8).toFixed(2));
    const fanPercent = Math.max(
      25,
      Math.min(100, Math.round(48 + wave * 18 + Math.random() * 10))
    );
    const acceptedShares = Math.max(0, Math.round(8 + wave * 3 + Math.random() * 6));
    const rejectedShares = Math.max(0, Math.round(Math.random() * 2 - wave));

    return {
      timestamp,
      hashrateGh,
      temperatureC,
      powerW,
      fanPercent,
      acceptedShares,
      rejectedShares
    };
  }
);

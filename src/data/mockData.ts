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
    const tempChipC = Number((58 + wave * 6 + Math.random() * 4).toFixed(1));
    const tempVrC = Number((52 + wave * 5 + Math.random() * 3).toFixed(1));
    const ambientTempC = Number((21 + wave * 1.5 + Math.random()).toFixed(1));
    const ambientHumidityPct = Math.round(45 + wave * 6 + Math.random() * 4);
    const powerW = Number((13 + wave * 1.2 + Math.random() * 0.8).toFixed(1));
    const efficiencyWPerTH = Number(((powerW * 1000) / hashrateGh).toFixed(1));
    const blockFound = 0;
    const fanPercent = Math.max(
      25,
      Math.min(100, Math.round(48 + wave * 18 + Math.random() * 10))
    );
    const acceptedShares = Math.max(0, Math.round(8 + wave * 3 + Math.random() * 6));
    const rejectedShares = Math.max(0, Math.round(Math.random() * 2 - wave));

    return {
      timestamp,
      hashrateGh,
      tempChipC,
      tempVrC,
      ambientTempC,
      ambientHumidityPct,
      powerW,
      efficiencyWPerTH,
      blockFound,
      fanPercent,
      acceptedShares,
      rejectedShares
    };
  }
);

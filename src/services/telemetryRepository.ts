import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { mockTelemetry } from "../data/mockData";
import type { TelemetryPoint } from "../types";
import { db, isFirebaseConfigured } from "./firebase";

const COLLECTION = import.meta.env.VITE_FIREBASE_COLLECTION || "telemetry";

export type TelemetryLoadResult = {
  points: TelemetryPoint[];
  source: "firebase" | "mock";
  info?: string;
};

function toFiniteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readPath(raw: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (typeof acc !== "object" || acc === null) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, raw);
}

function pickNumber(
  raw: Record<string, unknown>,
  keys: string[],
  fallback?: number
): number | null {
  for (const key of keys) {
    const value = toFiniteNumber(readPath(raw, key));
    if (value !== null) return value;
  }
  return fallback ?? null;
}

function pickTimestamp(raw: Record<string, unknown>): number | null {
  const candidates = [
    readPath(raw, "timestamp"),
    readPath(raw, "ts"),
    readPath(raw, "uploadedAt"),
    readPath(raw, "payload.ts"),
    readPath(raw, "payload.uploadedAt")
  ];

  for (const direct of candidates) {
    if (typeof direct === "number") return direct;
    if (typeof direct === "string") {
      const normalized = direct.replace(/(\.\d{3})\d+/, "$1");
      const fromString = Date.parse(normalized);
      if (Number.isFinite(fromString)) return fromString;
    }
    if (
      typeof direct === "object" &&
      direct !== null &&
      "toMillis" in direct &&
      typeof (direct as { toMillis: () => number }).toMillis === "function"
    ) {
      return (direct as { toMillis: () => number }).toMillis();
    }
  }

  return null;
}

function normalizePoint(raw: Record<string, unknown>): TelemetryPoint | null {
  const timestamp = pickTimestamp(raw);
  const hashrateGh = pickNumber(raw, [
    "hashrateGh",
    "hashrate",
    "hashRate",
    "decision.hashrate",
    "miner.hashRate",
    "miner.hashrateMonitor.asics.0.total",
    "miner.expectedHashrate",
    "payload.decision.hashrate",
    "payload.miner.hashRate",
    "payload.miner.hashrateMonitor.total",
    "payload.miner.expectedHashrate",
    "hash_rate",
    "ghs",
    "ghs5s"
  ]);
  const tempChipC = pickNumber(raw, [
    "tempChipC",
    "temp_chip",
    "chipTemp",
    "decision.chip",
    "miner.temp",
    "payload.decision.chip",
    "payload.miner.temp",
    "tempChip",
    "temperatureChip",
    "temp"
  ]);
  const tempVrC = pickNumber(
    raw,
    [
      "tempVrC",
      "temp_vr",
      "vrTemp",
      "tempVr",
      "temperatureVr",
      "decision.vr",
      "miner.vrTemp",
      "payload.decision.vr",
      "payload.miner.vrTemp"
    ],
    tempChipC ?? 0
  );
  const powerW = pickNumber(raw, [
    "powerW",
    "power",
    "watts",
    "consumptionW",
    "decision.power",
    "miner.power",
    "payload.decision.power",
    "payload.miner.power"
  ]);
  const fanPercent = pickNumber(
    raw,
    ["fanPercent", "fan", "fan_pct", "miner.fanspeed", "payload.miner.fanspeed"],
    0
  );
  const acceptedShares = pickNumber(
    raw,
    [
      "acceptedShares",
      "sharesAccepted",
      "shares",
      "miner.sharesAccepted",
      "payload.miner.sharesAccepted"
    ],
    0
  );
  const rejectedShares = pickNumber(
    raw,
    [
      "rejectedShares",
      "sharesRejected",
      "miner.sharesRejected",
      "payload.miner.sharesRejected"
    ],
    0
  );

  if (
    timestamp === null ||
    hashrateGh === null ||
    tempChipC === null ||
    powerW === null
  ) {
    return null;
  }

  const efficiencyWTh =
    pickNumber(raw, [
      "efficiencyWTh",
      "efficiency",
      "decision.eff_w_per_gh",
      "payload.decision.eff_w_per_gh"
    ]) ??
    (powerW > 0 ? (powerW * 1000) / hashrateGh : 0);

  const normalizedEfficiencyWTh =
    readPath(raw, "decision.eff_w_per_gh") !== undefined ||
    readPath(raw, "payload.decision.eff_w_per_gh") !== undefined
      ? efficiencyWTh * 1000
      : efficiencyWTh;

  return {
    timestamp,
    hashrateGh,
    tempChipC,
    tempVrC: tempVrC ?? tempChipC,
    powerW,
    efficiencyWTh: normalizedEfficiencyWTh,
    fanPercent: fanPercent ?? 0,
    acceptedShares: acceptedShares ?? 0,
    rejectedShares: rejectedShares ?? 0
  };
}

export async function loadTelemetry(): Promise<TelemetryLoadResult> {
  if (!isFirebaseConfigured || !db) {
    return { points: mockTelemetry, source: "mock", info: "firebase_not_configured" };
  }

  try {
    let snapshot;
    try {
      const telemetryQuery = query(
        collection(db, COLLECTION),
        orderBy("timestamp", "asc")
      );
      snapshot = await getDocs(telemetryQuery);
    } catch {
      snapshot = await getDocs(collection(db, COLLECTION));
    }
    const points = snapshot.docs
      .map((doc) => normalizePoint(doc.data()))
      .filter((point): point is TelemetryPoint => Boolean(point));
    points.sort((a, b) => a.timestamp - b.timestamp);

    return points.length > 0
      ? { points, source: "firebase" }
      : { points: [], source: "firebase", info: "firebase_documents_not_mapped" };
  } catch {
    return { points: [], source: "firebase", info: "firebase_read_error" };
  }
}

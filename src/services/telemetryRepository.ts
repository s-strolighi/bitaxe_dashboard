import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { mockTelemetry } from "../data/mockData";
import type { TelemetryPoint } from "../types";
import { db, isFirebaseConfigured, missingFirebaseConfigKeys } from "./firebase";

const COLLECTION = import.meta.env.VITE_FIREBASE_COLLECTION || "telemetry";

export type TelemetryLoadResult = {
  points: TelemetryPoint[];
  source: "firebase" | "mock";
  info?: string;
};

function formatFirebaseError(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const maybeCode = (error as { code?: unknown }).code;
    const maybeMessage = (error as { message?: unknown }).message;
    const code = typeof maybeCode === "string" ? maybeCode : "unknown";
    const message =
      typeof maybeMessage === "string"
        ? maybeMessage.replace(/\s+/g, " ").slice(0, 120)
        : "no_message";
    return `${code}:${message}`;
  }
  return "unknown:no_message";
}

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

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
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
    readPath(raw, "createdAt"),
    readPath(raw, "time"),
    readPath(raw, "date"),
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

function normalizePoint(raw: Record<string, unknown>): {
  point: TelemetryPoint | null;
  missing: string[];
} {
  const payload = asRecord(readPath(raw, "payload"));
  const data = asRecord(readPath(raw, "data"));
  const telemetry = asRecord(readPath(raw, "telemetry"));
  const merged = { ...raw, ...(payload ?? {}), ...(data ?? {}), ...(telemetry ?? {}) };

  const timestamp = pickTimestamp(merged);
  const hashrateGh = pickNumber(merged, [
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
  const tempChipC = pickNumber(merged, [
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
    merged,
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
  const powerW = pickNumber(merged, [
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
    merged,
    ["fanPercent", "fan", "fan_pct", "miner.fanspeed", "payload.miner.fanspeed"],
    0
  );
  const acceptedShares = pickNumber(
    merged,
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
    merged,
    [
      "rejectedShares",
      "sharesRejected",
      "miner.sharesRejected",
      "payload.miner.sharesRejected"
    ],
    0
  );

  const missing: string[] = [];
  if (timestamp === null) missing.push("timestamp");
  if (hashrateGh === null) missing.push("hashrate");
  if (tempChipC === null) missing.push("tempChip");
  if (powerW === null) missing.push("power");
  if (missing.length > 0) return { point: null, missing };
  const safeTimestamp = timestamp!;
  const safeHashrateGh = hashrateGh!;
  const safeTempChipC = tempChipC!;
  const safePowerW = powerW!;

  const efficiencyWTh =
    pickNumber(merged, [
      "efficiencyWTh",
      "efficiency",
      "decision.eff_w_per_gh",
      "payload.decision.eff_w_per_gh"
    ]) ??
    (safePowerW > 0 ? (safePowerW * 1000) / safeHashrateGh : 0);

  const normalizedEfficiencyWTh =
    readPath(merged, "decision.eff_w_per_gh") !== undefined ||
    readPath(merged, "payload.decision.eff_w_per_gh") !== undefined
      ? efficiencyWTh * 1000
      : efficiencyWTh;

  return {
    point: {
      timestamp: safeTimestamp,
      hashrateGh: safeHashrateGh,
      tempChipC: safeTempChipC,
      tempVrC: tempVrC ?? safeTempChipC,
      powerW: safePowerW,
      efficiencyWTh: normalizedEfficiencyWTh,
      fanPercent: fanPercent ?? 0,
      acceptedShares: acceptedShares ?? 0,
      rejectedShares: rejectedShares ?? 0
    },
    missing: []
  };
}

export async function loadTelemetry(): Promise<TelemetryLoadResult> {
  if (!isFirebaseConfigured || !db) {
    return {
      points: mockTelemetry,
      source: "mock",
      info: `firebase_not_configured_missing_${missingFirebaseConfigKeys.join(",")}`
    };
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
    const mapped = snapshot.docs.map((doc) =>
      normalizePoint(doc.data() as Record<string, unknown>)
    );
    const points = mapped
      .map((entry) => entry.point)
      .filter((point): point is TelemetryPoint => Boolean(point));
    points.sort((a, b) => a.timestamp - b.timestamp);

    return points.length > 0
      ? { points, source: "firebase" }
      : {
          points: [],
          source: "firebase",
          info: `firebase_documents_not_mapped_docs_${snapshot.docs.length}_example_missing_${
            mapped.find((entry) => entry.missing.length > 0)?.missing.join(",") ??
            "unknown"
          }`
        };
  } catch (error) {
    return {
      points: [],
      source: "firebase",
      info: `firebase_read_error_${formatFirebaseError(error)}`
    };
  }
}

import { collection, getDocs } from "firebase/firestore";
import { mockTelemetry } from "../data/mockData";
import type { TelemetryPoint } from "../types";
import {
  db,
  firebaseDatabaseId,
  isFirebaseConfigured,
  missingFirebaseConfigKeys
} from "./firebase";

const COLLECTION = import.meta.env.VITE_FIREBASE_COLLECTION || "telemetry";

export type TelemetryLoadResult = {
  points: TelemetryPoint[];
  source: "firebase" | "mock";
  info?: string;
  debug?: {
    collection: string;
    database: string;
    docCount: number;
    sampleCount: number;
    validCount: number;
    dayIds: string[];
  };
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
  fallback?: number | null
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

function normalizeSample(raw: Record<string, unknown>): {
  point: TelemetryPoint | null;
  missing: string[];
} {
  const payload = asRecord(readPath(raw, "payload"));
  const data = asRecord(readPath(raw, "data"));
  const telemetry = asRecord(readPath(raw, "telemetry"));
  const merged = { ...raw, ...(payload ?? {}), ...(data ?? {}), ...(telemetry ?? {}) };

  const timestamp = pickTimestamp(merged);
  const hashrateTh = pickNumber(merged, ["hashrate_th", "hashrateTh"], null);
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
  const resolvedHashrateGh =
    hashrateTh !== null ? hashrateTh * 1000 : hashrateGh;
  const tempChipC = pickNumber(merged, [
    "chip_temp_c",
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
      "vr_temp_c",
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
  const ambientTempC = pickNumber(
    merged,
    [
      "ambient_temp_c",
      "ambientTempC",
      "ambient.temp_c",
      "payload.ambient.temp_c",
      "ambient.tempC",
      "payload.ambient.tempC",
      "ambient.temperature",
      "ambient.temp"
    ],
    null
  );
  const ambientHumidityPct = pickNumber(
    merged,
    [
      "ambient_humidity_pct",
      "ambientHumidityPct",
      "ambient.humidity_pct",
      "payload.ambient.humidity_pct",
      "ambient.humidityPct",
      "payload.ambient.humidityPct",
      "ambient.humidity"
    ],
    null
  );
  const powerW = pickNumber(merged, [
    "power_w",
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
  const blockFound = pickNumber(
    merged,
    ["blockFound", "blocksFound", "miner.blockFound", "payload.miner.blockFound"],
    0
  );
  const sharesTotal = pickNumber(
    merged,
    ["shares_total", "sharesTotal", "shares", "miner.sharesAccepted"],
    0
  );
  const sharesRejected = pickNumber(
    merged,
    ["shares_rejected", "sharesRejected", "miner.sharesRejected"],
    0
  );
  const event = readPath(merged, "event");
  const normalizedEvent = (() => {
    if (event === "tuning_up" || event === "tuning_down") return event;
    if (typeof event === "string") {
      const lowered = event.trim().toLowerCase();
      if (lowered.includes("tuning") && lowered.includes("up")) return "tuning_up";
      if (lowered.includes("tuning") && lowered.includes("down")) return "tuning_down";
      if (lowered === "up") return "tuning_up";
      if (lowered === "down") return "tuning_down";
    }
    return null;
  })();

  const missing: string[] = [];
  if (timestamp === null) missing.push("timestamp");
  if (resolvedHashrateGh === null) missing.push("hashrate");
  if (tempChipC === null) missing.push("tempChip");
  if (powerW === null) missing.push("power");
  if (missing.length > 0) return { point: null, missing };
  const safeTimestamp = timestamp!;
  const safeHashrateGh = resolvedHashrateGh!;
  const safeTempChipC = tempChipC!;
  const safePowerW = powerW!;

  const efficiencyWPerTH =
    pickNumber(merged, [
      "eff_w_per_th",
      "efficiencyWPerTH",
      "efficiencyWTh",
      "efficiency",
      "miner.efficiencyWPerTH",
      "payload.miner.efficiencyWPerTH",
      "decision.eff_w_per_gh",
      "payload.decision.eff_w_per_gh"
    ]) ??
    (safePowerW > 0 ? (safePowerW * 1000) / safeHashrateGh : 0);

  const normalizedEfficiencyWPerTH =
    readPath(merged, "decision.eff_w_per_gh") !== undefined ||
    readPath(merged, "payload.decision.eff_w_per_gh") !== undefined
      ? efficiencyWPerTH * 1000
      : efficiencyWPerTH;

  return {
    point: {
      timestamp: safeTimestamp,
      hashrateGh: safeHashrateGh,
      tempChipC: safeTempChipC,
      tempVrC: tempVrC ?? safeTempChipC,
      ambientTempC,
      ambientHumidityPct,
      powerW: safePowerW,
      efficiencyWPerTH: normalizedEfficiencyWPerTH,
      blockFound: blockFound ?? 0,
      fanPercent: fanPercent ?? 0,
      sharesTotal: sharesTotal ?? 0,
      sharesRejected: sharesRejected ?? 0,
      event: normalizedEvent
    },
    missing: []
  };
}

function extractDailySamples(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter((item) => typeof item === "object" && item !== null) as Record<
      string,
      unknown
    >[];
  }

  const root = asRecord(data);
  if (!root) return [];

  const candidates = [
    readPath(root, "samples"),
    readPath(root, "data"),
    readPath(root, "points"),
    readPath(root, "measurements"),
    readPath(root, "telemetry"),
    readPath(root, "daily"),
    readPath(root, "entries"),
    readPath(root, "records"),
    readPath(root, "values")
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item) => typeof item === "object" && item !== null) as Record<
        string,
        unknown
      >[];
    }
    const candidateRecord = asRecord(candidate);
    if (candidateRecord) {
      const values = Object.values(candidateRecord);
      if (
        values.length > 0 &&
        values.every((item) => typeof item === "object" && item !== null)
      ) {
        const maybeSamples = values as Record<string, unknown>[];
        if (maybeSamples.some((item) => typeof item.ts === "string")) {
          return maybeSamples;
        }
      }
    }
  }

  const values = Object.values(root);
  if (values.length > 0 && values.every((item) => typeof item === "object" && item !== null)) {
    const maybeSamples = values as Record<string, unknown>[];
    if (maybeSamples.some((item) => typeof item.ts === "string")) {
      return maybeSamples;
    }
  }
  return [];
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
    const snapshot = await getDocs(collection(db, COLLECTION));
    let sampleCount = 0;
    const mapped = snapshot.docs.flatMap((doc) => {
      const data = doc.data() as Record<string, unknown>;
      const samples = extractDailySamples(data);
      if (samples.length === 0) {
        sampleCount += 1;
        return [normalizeSample(data)];
      }
      sampleCount += samples.length;
      return samples.map((sample) => normalizeSample(sample));
    });
    const points = mapped
      .map((entry) => entry.point)
      .filter((point): point is TelemetryPoint => Boolean(point));
    points.sort((a, b) => a.timestamp - b.timestamp);

    return points.length > 0
      ? {
          points,
          source: "firebase",
          debug: {
            collection: COLLECTION,
            database: firebaseDatabaseId || "default",
            docCount: snapshot.docs.length,
            sampleCount,
            validCount: points.length,
            dayIds: snapshot.docs.map((doc) => doc.id)
          }
        }
      : {
          points: [],
          source: "firebase",
          info: `firebase_documents_not_mapped_db_${firebaseDatabaseId || "default"}_collection_${COLLECTION}_docs_${snapshot.docs.length}_example_missing_${
            mapped.find((entry) => entry.missing.length > 0)?.missing.join(",") ??
            "unknown"
          }`,
          debug: {
            collection: COLLECTION,
            database: firebaseDatabaseId || "default",
            docCount: snapshot.docs.length,
            sampleCount,
            validCount: 0,
            dayIds: snapshot.docs.map((doc) => doc.id)
          }
        };
  } catch (error) {
    return {
      points: [],
      source: "firebase",
      info: `firebase_read_error_${formatFirebaseError(error)}`,
      debug: {
        collection: COLLECTION,
        database: firebaseDatabaseId || "default",
        docCount: 0,
        sampleCount: 0,
        validCount: 0,
        dayIds: []
      }
    };
  }
}

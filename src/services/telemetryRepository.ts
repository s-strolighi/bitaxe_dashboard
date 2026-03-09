import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { mockTelemetry } from "../data/mockData";
import type { TelemetryPoint } from "../types";
import { db, isFirebaseConfigured } from "./firebase";

const COLLECTION = import.meta.env.VITE_FIREBASE_COLLECTION || "telemetry";

function normalizePoint(raw: Record<string, unknown>): TelemetryPoint | null {
  const timestamp = Number(raw.timestamp);
  const hashrateGh = Number(raw.hashrateGh);
  const temperatureC = Number(raw.temperatureC);
  const powerW = Number(raw.powerW);
  const fanPercent = Number(raw.fanPercent ?? 0);
  const acceptedShares = Number(raw.acceptedShares ?? 0);
  const rejectedShares = Number(raw.rejectedShares ?? 0);

  if (
    Number.isNaN(timestamp) ||
    Number.isNaN(hashrateGh) ||
    Number.isNaN(temperatureC) ||
    Number.isNaN(powerW)
  ) {
    return null;
  }

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

export async function loadTelemetry(): Promise<TelemetryPoint[]> {
  if (!isFirebaseConfigured || !db) {
    return mockTelemetry;
  }

  try {
    const telemetryQuery = query(
      collection(db, COLLECTION),
      orderBy("timestamp", "asc")
    );
    const snapshot = await getDocs(telemetryQuery);
    const points = snapshot.docs
      .map((doc) => normalizePoint(doc.data()))
      .filter((point): point is TelemetryPoint => Boolean(point));

    return points.length > 0 ? points : mockTelemetry;
  } catch {
    return mockTelemetry;
  }
}

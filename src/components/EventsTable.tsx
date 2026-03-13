import type { TelemetryPoint } from "../types";
import { formatNumber, formatTimestamp } from "../lib/metrics";

type EventsTableProps = {
  telemetry: TelemetryPoint[];
};

export function EventsTable({ telemetry }: EventsTableProps) {
  const rows = [...telemetry]
    .filter((point) => point.event)
    .reverse()
    .slice(0, 12);

  return (
    <section className="table-card">
      <header>
        <h3>Ultimi eventi di tuning</h3>
        <p>Ultimi 12 eventi registrati</p>
      </header>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Ora</th>
              <th>Evento</th>
              <th>Hashrate (TH/s)</th>
              <th>Temp Chip (°C)</th>
              <th>Temp VR (°C)</th>
              <th>Temp Est. (°C)</th>
              <th>Potenza (W)</th>
              <th>Efficienza (W/TH)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8}>Nessun evento di tuning nel range selezionato.</td>
              </tr>
            ) : (
              rows.map((point) => (
                <tr key={point.timestamp}>
                  <td>{formatTimestamp(point.timestamp)}</td>
                  <td>{point.event}</td>
                  <td>{formatNumber(point.hashrateGh / 1000, 2)}</td>
                  <td>{formatNumber(point.tempChipC, 1)}</td>
                  <td>{formatNumber(point.tempVrC, 1)}</td>
                  <td>
                    {point.ambientTempC === null
                      ? "-"
                      : formatNumber(point.ambientTempC, 1)}
                  </td>
                  <td>{formatNumber(point.powerW, 1)}</td>
                  <td>{formatNumber(point.efficiencyWPerTH, 1)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

import type { TelemetryPoint } from "../types";
import { formatNumber, formatTimestamp } from "../lib/metrics";

type TelemetryTableProps = {
  telemetry: TelemetryPoint[];
};

export function TelemetryTable({ telemetry }: TelemetryTableProps) {
  const rows = [...telemetry].reverse().slice(0, 12);

  return (
    <section className="table-card">
      <header>
        <h3>Ultimi campioni</h3>
        <p>Ultime 12 rilevazioni registrate</p>
      </header>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Ora</th>
              <th>Hashrate (TH/s)</th>
              <th>Temp Chip (°C)</th>
              <th>Temp VR (°C)</th>
              <th>Temp Est. (°C)</th>
              <th>Potenza (W)</th>
              <th>Efficienza (W/TH)</th>
              <th>Evento</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((point) => (
              <tr key={point.timestamp}>
                <td>{formatTimestamp(point.timestamp)}</td>
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
                <td>{point.event ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

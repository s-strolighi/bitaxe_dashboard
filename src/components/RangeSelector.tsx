import type { TimeRange } from "../types";

type RangeSelectorProps = {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
};

const optionGroups: { label: string; options: { value: TimeRange; label: string }[] }[] = [
  {
    label: "Ore",
    options: [
      { value: "1h", label: "1 ora" },
      { value: "3h", label: "3 ore" },
      { value: "6h", label: "6 ore" }
    ]
  },
  {
    label: "Giorni",
    options: [
      { value: "1d", label: "1 giorno" },
      { value: "3d", label: "3 giorni" },
      { value: "7d", label: "7 giorni" },
      { value: "15d", label: "15 giorni" }
    ]
  },
  {
    label: "Mesi",
    options: [
      { value: "1mo", label: "1 mese" },
      { value: "3mo", label: "3 mesi" },
      { value: "6mo", label: "6 mesi" },
      { value: "1y", label: "1 anno" }
    ]
  },
  {
    label: "Altro",
    options: [{ value: "all", label: "Tutto" }]
  }
];

export function RangeSelector({ value, onChange }: RangeSelectorProps) {
  return (
    <div className="range-selector">
      <label className="range-label" htmlFor="range-select">
        Intervallo
      </label>
      <select
        id="range-select"
        value={value}
        onChange={(event) => onChange(event.target.value as TimeRange)}
      >
        {optionGroups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

import type { TimeRange } from "../types";

type RangeSelectorProps = {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
};

const options: { value: TimeRange; label: string }[] = [
  { value: "6h", label: "6 ore" },
  { value: "24h", label: "24 ore" },
  { value: "7d", label: "7 giorni" },
  { value: "30d", label: "30 giorni" },
  { value: "all", label: "Tutto" }
];

export function RangeSelector({ value, onChange }: RangeSelectorProps) {
  return (
    <div className="range-selector">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? "active" : ""}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// "Auto" or a number within [min, max]. null means Auto.
export default function CountControl({
  label,
  value,
  onChange,
  min,
  max,
  autoStart,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  min: number;
  max: number;
  autoStart: number;
}) {
  const down = () => {
    if (value === null) return;
    onChange(value <= min ? null : value - 1);
  };
  const up = () => onChange(value === null ? autoStart : Math.min(max, value + 1));
  return (
    <div className="count-ctl">
      <span>{label}</span>
      <span className="ctl">
        <button type="button" onClick={down} disabled={value === null} aria-label={`Fewer ${label.toLowerCase()}`}>−</button>
        <span className={value === null ? "auto" : ""} aria-live="polite">{value === null ? "Auto" : value}</span>
        <button type="button" onClick={up} disabled={value === max} aria-label={`More ${label.toLowerCase()}`}>+</button>
      </span>
    </div>
  );
}

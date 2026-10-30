import { RadarMark } from "./Radar";

export interface JourneyStep {
  label: string;
  enabled: boolean;
}

/** Top navigation drawn as a path: stops fill in ember as you progress. */
export default function JourneyNav({
  steps,
  current,
  scrolled,
  onGo,
  onHome,
}: {
  steps: JourneyStep[];
  current: number;
  scrolled: boolean;
  onGo: (index: number) => void;
  onHome: () => void;
}) {
  return (
    <nav className={`nav ${scrolled ? "scrolled" : ""}`}>
      <div className="wrap nav-inner">
        <button className="brand" onClick={onHome} aria-label="RadarQ home">
          <RadarMark />
          <span>RadarQ</span>
        </button>
        <ol className="journey" aria-label="Progress">
          {steps.map((s, i) => {
            const state = i === current ? "now" : i < current ? "past" : s.enabled ? "ahead" : "locked";
            const clickable = s.enabled && i !== current;
            return (
              <li key={s.label} className={`jstop ${state}`}>
                {i > 0 && (
                  <span className="jlink" aria-hidden="true">
                    <span className="jfill" style={{ transform: `scaleX(${i <= current ? 1 : 0})` }} />
                  </span>
                )}
                <button
                  className="jnode"
                  onClick={() => clickable && onGo(i)}
                  disabled={!clickable && i !== current}
                  aria-current={i === current ? "step" : undefined}
                >
                  <span className="jdot">{i < current ? "✓" : String(i + 1).padStart(2, "0")}</span>
                  <span className="jlabel">{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

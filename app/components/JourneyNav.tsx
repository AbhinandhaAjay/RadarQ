import type { Dictation } from "@/lib/types";
import { RadarMark } from "./Radar";
import WisprBadge from "./WisprBadge";

export interface JourneyStep {
  label: string;
  enabled: boolean;
}

/** Top navigation drawn as a path: stops fill in ember as you progress. */
export default function JourneyNav({
  steps,
  current,
  onGo,
  onHome,
  dictation,
}: {
  steps: JourneyStep[];
  current: number;
  onGo: (index: number) => void;
  onHome: () => void;
  /** Everything dictated with Wispr Flow in this visit, measured from real input bursts. */
  dictation?: Dictation;
}) {
  return (
    <nav className="nav">
      <div className="wrap nav-inner">
        <button className="brand" onClick={onHome} aria-label="RadarQ home">
          <RadarMark />
          <span>RadarQ</span>
        </button>
        <span className="nav-wispr" aria-live="polite">
          <WisprBadge d={dictation} prefix="Dictated this session" />
        </span>
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

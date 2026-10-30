import type { SourceId } from "@/lib/types";
import { hash01 } from "@/lib/client";

export interface Blip {
  id: string;
  source: SourceId;
}

const SOURCE_VAR: Record<SourceId, string> = {
  reddit: "var(--src-reddit)",
  hackernews: "var(--src-hackernews)",
  bluesky: "var(--src-bluesky)",
  stackexchange: "var(--src-stackexchange)",
};

// The sweep is drawn as thin wedges with falling opacity, which reads as a
// fading trail without needing conic gradients in SVG.
const WEDGES = Array.from({ length: 14 }, (_, i) => {
  const a0 = (-(i + 1) * 4 * Math.PI) / 180;
  const a1 = (-i * 4 * Math.PI) / 180;
  const r = 92;
  const p = (a: number) => `${100 + r * Math.cos(a)} ${100 + r * Math.sin(a)}`;
  return { d: `M100 100 L${p(a0)} A${r} ${r} 0 0 1 ${p(a1)} Z`, o: 0.3 * (1 - i / 14) };
});

export default function Radar({ blips, fast = false, label }: { blips: Blip[]; fast?: boolean; label?: string }) {
  return (
    <svg className={`radar ${fast ? "fast" : ""}`} viewBox="0 0 200 200" role="img" aria-label={label ?? "Radar scanning for issues"}>
      <defs>
        <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2a1610" />
          <stop offset="100%" stopColor="#0d0c0b" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="94" fill="url(#radarBg)" />
      {[30, 60].map((r) => (
        <circle key={r} className="ring" cx="100" cy="100" r={r} />
      ))}
      <circle className="ring outer" cx="100" cy="100" r="92" />
      <line className="axis" x1="8" y1="100" x2="192" y2="100" />
      <line className="axis" x1="100" y1="8" x2="100" y2="192" />
      <g className="sweep">
        {WEDGES.map((w, i) => (
          <path key={i} d={w.d} fill="var(--amber)" fillOpacity={w.o} />
        ))}
        <line x1="100" y1="100" x2="192" y2="100" stroke="var(--amber)" strokeWidth="1.6" strokeLinecap="round" />
      </g>
      {blips.map((b, i) => {
        const a = hash01(b.id) * Math.PI * 2;
        const r = 18 + hash01(b.id + "r") * 68;
        const x = 100 + r * Math.cos(a);
        const y = 100 + r * Math.sin(a);
        const color = SOURCE_VAR[b.source];
        return (
          <g key={b.id}>
            <circle className="blip-ring" cx={x} cy={y} r="3" stroke={color} style={{ animationDelay: `${(i % 7) * 0.3}s` }} />
            <circle className="blip" cx={x} cy={y} r="3" fill={color} style={{ animationDelay: `${Math.min(i, 30) * 0.04}s` }} />
          </g>
        );
      })}
      <circle className="center" cx="100" cy="100" r="3.5" />
    </svg>
  );
}

// Ember brand mark: a radar dish with one signal.
export function RadarMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="var(--amber)" strokeOpacity=".35" strokeWidth="1" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="var(--amber)" strokeOpacity=".55" strokeWidth="1" />
      <path d="M16 16 L26 9" stroke="var(--amber)" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="16" cy="16" r="2" fill="var(--amber)" />
      <circle cx="21.5" cy="20.5" r="2" fill="var(--ember)" />
    </svg>
  );
}

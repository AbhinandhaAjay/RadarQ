"use client";

import { useState } from "react";
import type { Issue } from "@/lib/types";
import { hash01 } from "@/lib/client";

const W = 560;
const H = 330;
const M = { top: 16, right: 18, bottom: 40, left: 44 };
const IW = W - M.left - M.right;
const IH = H - M.top - M.bottom;

// Pain runs 1-5, fit 0-100. Jitter keeps equal-pain issues from stacking,
// and is clamped so bubbles at pain 1 or 5 stay inside the plot.
const xOf = (pain: number, id: string) => {
  const t = (pain - 1 + (hash01(id) - 0.5) * 0.7) / 4;
  return M.left + Math.min(0.96, Math.max(0.04, t)) * IW;
};
const yOf = (fit: number) => M.top + (1 - fit / 100) * IH;
const rOf = (mentions: number) => Math.min(24, 10 + mentions * 3);

export default function OpportunityMap({
  issues,
  rank,
  selected,
  onSelect,
}: {
  issues: Issue[];
  rank: Map<string, number>;
  selected: Set<string>;
  onSelect: (id: string) => void;
}) {
  const [hover, setHover] = useState<Issue | null>(null);

  const qx = xOf(3, "center");
  const qy = yOf(60);

  return (
    <div className="map-card ember-stage">
      <p className="hint">Pain against fit for your brief. Bigger circles were heard more often. Click one to open it; shortlisted issues are filled in.</p>
      <div style={{ position: "relative" }}>
        <svg className="omap" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Scatter plot of issues by pain and fit">
          <rect className="quad" x={qx} y={M.top} width={M.left + IW - qx} height={qy - M.top} rx="10" />
          <text className="quad-label" x={M.left + IW - 10} y={M.top + 18} textAnchor="end">Build this ↗</text>
          {[0, 25, 50, 75, 100].map((f) => (
            <g key={f}>
              <line className="grid" x1={M.left} x2={M.left + IW} y1={yOf(f)} y2={yOf(f)} />
              <text className="tick" x={M.left - 8} y={yOf(f) + 3} textAnchor="end">{f}</text>
            </g>
          ))}
          {[1, 2, 3, 4, 5].map((p) => (
            <text key={p} className="tick" x={M.left + ((p - 1) / 4) * IW} y={M.top + IH + 16} textAnchor="middle">{p}</text>
          ))}
          <text className="axis-label" x={M.left + IW / 2} y={H - 4} textAnchor="middle">Pain (1 mild → 5 severe)</text>
          <text className="axis-label" transform={`translate(12 ${M.top + IH / 2}) rotate(-90)`} textAnchor="middle">Fit for you</text>
          {issues.map((i, n) => {
            const x = xOf(i.painScore, i.id);
            const y = yOf(i.fitScore);
            const r = rOf(i.mentions);
            const sel = selected.has(i.id);
            return (
              <g
                key={i.id}
                className={`bubble ${sel ? "sel" : ""} ${hover && hover.id !== i.id ? "dim" : ""}`}
                style={{ animationDelay: `${n * 0.06}s` }}
                onClick={() => onSelect(i.id)}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect(i.id))}
                tabIndex={0}
                role="button"
                aria-pressed={sel}
                aria-label={`${i.title}. Opportunity ${i.opportunity}. Pain ${i.painScore} of 5, fit ${i.fitScore}.`}
              >
                <circle className="hit" cx={x} cy={y} r={r + 8} />
                <circle className="dot" cx={x} cy={y} r={r} />
                <text x={x} y={y + 4} textAnchor="middle">{rank.get(i.id)}</text>
              </g>
            );
          })}
        </svg>
        {hover && (
          <div
            className="tip"
            style={{
              left: `${(xOf(hover.painScore, hover.id) / W) * 100}%`,
              top: `${((yOf(hover.fitScore) - rOf(hover.mentions)) / H) * 100}%`,
            }}
          >
            <b>#{rank.get(hover.id)} {hover.title}</b>
            <div className="row"><span>Opportunity</span><span>{hover.opportunity}</span></div>
            <div className="row"><span>Pain · Fit</span><span>{hover.painScore}/5 · {hover.fitScore}</span></div>
            <div className="row"><span>Mentions</span><span>{hover.mentions}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}

import type { EvidenceStrength as Strength } from "@/lib/evidence";
import { SOURCE_LABELS } from "@/lib/types";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

/** Score, honest flags, and a strip of when each cited post was written. */
export default function EvidenceStrength({ s }: { s: Strength }) {
  const W = 480;
  const pad = 14;
  const start = s.oldest ? Date.parse(s.oldest) : 0;
  const end = s.newest ? Date.parse(s.newest) : 0;
  const span = Math.max(1, end - start);
  const x = (iso: string) => (end === start ? W / 2 : pad + ((Date.parse(iso) - start) / span) * (W - pad * 2));

  return (
    <div className={`strength ${s.label.toLowerCase()}`}>
      <div className="strength-top">
        <div>
          <span className="strength-score">{s.score}</span>
          <span className="strength-label">{s.label} evidence</span>
        </div>
        <dl className="strength-facts">
          <div><dt>posts</dt><dd>{s.posts}</dd></div>
          <div><dt>communities</dt><dd>{s.communities}</dd></div>
          <div><dt>platforms</dt><dd>{s.platforms}</dd></div>
          <div><dt>last 90 days</dt><dd>{s.recent}</dd></div>
        </dl>
      </div>

      {s.dated.length > 0 && (
        <figure className="timeline-strip">
          <figcaption>When it was said</figcaption>
          <svg viewBox={`0 0 ${W} 46`} role="img" aria-label={`${s.dated.length} posts from ${s.oldest ? fmt(s.oldest) : ""} to ${s.newest ? fmt(s.newest) : ""}`}>
            <line x1={pad} x2={W - pad} y1="18" y2="18" className="ts-axis" />
            {s.dated.map((p, i) => (
              <circle key={p.id} cx={x(p.createdAt)} cy={18 + ((i % 3) - 1) * 5} r="5" className={`ts-dot ${p.source}`}>
                <title>{`${SOURCE_LABELS[p.source]} · ${p.community} · ${fmt(p.createdAt)}`}</title>
              </circle>
            ))}
            {s.oldest && <text x={pad} y="42" className="ts-label">{fmt(s.oldest)}</text>}
            {s.newest && end !== start && <text x={W - pad} y="42" textAnchor="end" className="ts-label">{fmt(s.newest)}</text>}
          </svg>
        </figure>
      )}

      {s.flags.length > 0 && (
        <ul className="strength-flags">
          {s.flags.map((f) => <li key={f}>{f}</li>)}
        </ul>
      )}
      <p className="fineprint">Worked out from the cited posts only: different communities and platforms count more than repeat mentions.</p>
    </div>
  );
}

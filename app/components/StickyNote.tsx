import type { Issue } from "@/lib/types";
import { SOURCE_LABELS } from "@/lib/types";
import { hash01 } from "@/lib/client";

export type Tier = "build" | "worth" | "crowded";

/** The visible face of a note; shared by the board, the drag overlay and the shortlist. */
export default function StickyNote({
  issue,
  rank,
  tier,
  selected,
  evidence,
  dragging = false,
  overlay = false,
  onToggle,
}: {
  issue: Issue;
  rank: number;
  tier: Tier;
  selected: boolean;
  evidence?: string;
  dragging?: boolean;
  overlay?: boolean;
  onToggle?: () => void;
}) {
  const tilt = overlay ? -3 : (hash01(issue.id + "tilt") - 0.5) * 5;
  const openGap = issue.existingTools.length === 0;
  const tape = issue.sources[0] ?? "reddit";

  return (
    <div
      className={`note ${tier} ${selected ? "picked" : ""} ${dragging ? "ghost" : ""} ${overlay ? "lifted" : ""}`}
      style={{ "--tilt": `${tilt}deg` } as React.CSSProperties}
    >
      <span className={`tape ${tape}`} aria-hidden="true" />
      <div className="note-top">
        <span className="note-rank">#{rank}</span>
        <span className="note-opp" title="Opportunity score">
          {issue.opportunity}
          <small>opp</small>
        </span>
      </div>
      <h4 className="note-title">{issue.title}</h4>
      <div className="note-meta">
        <span className="pain" aria-label={`Pain ${issue.painScore} of 5`}>
          {Array.from({ length: 5 }, (_, i) => (
            <i key={i} className={i < issue.painScore ? "on" : ""} />
          ))}
        </span>
        <span>{issue.mentions}× heard</span>
        {evidence && <span className={`ev-tag ${evidence.toLowerCase()}`}>{evidence} evidence</span>}
        <span className="note-srcs">{issue.sources.map((s) => SOURCE_LABELS[s].split(" ")[0]).join(" · ")}</span>
      </div>
      {openGap && <span className="stamp">open gap</span>}
      {rank === 1 && !overlay && <span className="scribble">top pick!</span>}
      {onToggle && (
        <button
          className={`note-pin ${selected ? "on" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-pressed={selected}
          aria-label={selected ? `Remove ${issue.title} from shortlist` : `Add ${issue.title} to shortlist`}
          title={selected ? "In your shortlist" : "Add to shortlist"}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </button>
      )}
    </div>
  );
}

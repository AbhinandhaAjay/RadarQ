import type { DevilReport as Report, Issue, Post } from "@/lib/types";
import { SOURCE_LABELS } from "@/lib/types";
import type { EvidenceStrength as Strength } from "@/lib/evidence";
import EvidenceStrength from "./EvidenceStrength";
import DevilReport from "./DevilReport";

export default function IssueDrawer({
  issue,
  rank,
  posts,
  selected,
  onToggle,
  strength,
  devil,
  devilLoading,
  onDevil,
}: {
  issue: Issue;
  rank: number;
  posts: Post[];
  selected: boolean;
  onToggle: () => void;
  strength: Strength;
  devil?: Report;
  devilLoading: boolean;
  onDevil: () => void;
}) {
  const cited = issue.postIds.map((id) => posts.find((p) => p.id === id)).filter((p): p is Post => Boolean(p));
  const openGap = issue.existingTools.length === 0;

  return (
    <div className="dr">
      <p className="eyebrow">Issue #{rank} · {issue.mentions}× heard · {issue.sources.map((s) => SOURCE_LABELS[s]).join(", ")}</p>
      <h2 className="dr-title">{issue.title}</h2>
      <p className="dr-lead">{issue.summary}</p>

      <div className="dr-scores">
        <div className="dr-score big">
          <span className="mono-num">{issue.opportunity}</span>
          <small>opportunity</small>
        </div>
        <div className="dr-bars">
          <div className="barrow" title={issue.painReason}>
            <span>pain</span>
            <span className="tr"><span className="fl pain" style={{ width: `${(issue.painScore / 5) * 100}%` }} /></span>
            <span className="v">{issue.painScore}/5</span>
          </div>
          <div className="barrow" title={issue.fitReason}>
            <span>fit</span>
            <span className="tr"><span className="fl fit" style={{ width: `${issue.fitScore}%` }} /></span>
            <span className="v">{issue.fitScore}</span>
          </div>
        </div>
      </div>

      <button className={`btn ${selected ? "" : "primary"} wide`} onClick={onToggle}>
        {selected ? "✓ In your shortlist · remove" : "Add to shortlist"}
      </button>

      <section className="dr-sec">
        <h3>How strong is the evidence</h3>
        <EvidenceStrength s={strength} />
      </section>

      <section className="dr-sec">
        <h3>Devil's advocate</h3>
        {devil ? (
          <DevilReport report={devil} />
        ) : (
          <div className="devil-cta">
            <p>Before you commit, let the radar argue against this problem using the same posts.</p>
            <button className="btn" onClick={onDevil} disabled={devilLoading}>
              {devilLoading ? "Building the case against…" : "Argue against this"}
            </button>
          </div>
        )}
      </section>

      {issue.affected && (
        <section className="dr-sec">
          <h3>Who it hurts</h3>
          <p>{issue.affected}</p>
          {issue.painReason && <p className="muted">{issue.painReason}</p>}
        </section>
      )}

      <section className="dr-sec">
        <h3>What people said</h3>
        <div className="quotes">
          {issue.quotes.map((q, i) => (
            <blockquote key={i} className={`quote ${q.source}`}>
              <p>“{q.text}”</p>
              <a href={q.url} target="_blank" rel="noopener noreferrer">{q.community} ↗</a>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="dr-sec">
        <h3>Already out there</h3>
        {openGap ? (
          <p><span className="stamp inline">open gap</span> No well-known tool targets this exact pain. Worth a quick search before you commit.</p>
        ) : (
          <ul className="tools">
            {issue.existingTools.map((t) => (
              <li key={t.name}><b>{t.name}</b>{t.gap ? <span> lacks: {t.gap}</span> : null}</li>
            ))}
          </ul>
        )}
      </section>

      {issue.fitReason && (
        <section className="dr-sec">
          <h3>Why it fits you</h3>
          <p>{issue.fitReason}</p>
        </section>
      )}

      {cited.length > 0 && (
        <section className="dr-sec">
          <h3>Source posts ({cited.length})</h3>
          <ul className="post-list">
            {cited.map((p) => (
              <li key={p.id}>
                <span className={`feed-src ${p.source}`}>{p.community}</span>
                <a href={p.url} target="_blank" rel="noopener noreferrer">{p.title.startsWith("Post by") || p.title.startsWith("Comment") ? p.text.slice(0, 120) : p.title}</a>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="fineprint">Quotes are copied from the posts. Scores and tools are AI estimates.</p>
    </div>
  );
}

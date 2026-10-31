import type { Comparison, ContenderScore, DevilReport as Report } from "@/lib/types";
import CountControl from "./CountControl";
import DevilReport from "./DevilReport";

const DIMENSIONS: { key: keyof Pick<ContenderScore, "pain" | "evidence" | "competition" | "fit" | "buildability">; label: string; invert?: boolean }[] = [
  { key: "pain", label: "Pain" },
  { key: "evidence", label: "Evidence" },
  { key: "competition", label: "Open market", invert: true },
  { key: "fit", label: "Fit for you" },
  { key: "buildability", label: "Buildable in time" },
];

function Side({ s, tag, won }: { s: ContenderScore; tag: "A" | "B"; won: boolean }) {
  return (
    <article className={`contender ${won ? "won" : ""}`}>
      <div className="contender-top">
        <span className="contender-tag">{tag}</span>
        {won && <span className="hand winner-mark">the pick!</span>}
        <span className="contender-total" title="Overall score out of 100">{s.total}</span>
      </div>
      <h3>{s.label}</h3>
      {s.description && s.description !== s.label && <p className="contender-desc">{s.description}</p>}

      <div className="dims">
        {DIMENSIONS.map((d) => {
          const v = d.invert ? 10 - s[d.key] : s[d.key];
          return (
            <div key={d.key} className="barrow wide">
              <span>{d.label}</span>
              <span className="tr"><span className={`fl ${won ? "pain" : "fit"}`} style={{ width: `${v * 10}%` }} /></span>
              <span className="v">{v}/10</span>
            </div>
          );
        })}
      </div>
      <p className="contender-strength">
        Evidence from posts: <b>{s.strengthLabel}</b> ({s.strength}/100)
      </p>

      {s.strengths.length > 0 && (
        <>
          <h4>Going for it</h4>
          <ul className="plus">{s.strengths.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </>
      )}
      {s.weaknesses.length > 0 && (
        <>
          <h4>Against it</h4>
          <ul className="minus">{s.weaknesses.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </>
      )}
      {s.quotes.map((q, i) => (
        <blockquote key={i} className={`quote ${q.source}`}>
          <p>“{q.text}”</p>
          <a href={q.url} target="_blank" rel="noopener noreferrer">{q.community} ↗</a>
        </blockquote>
      ))}
    </article>
  );
}

export default function CompareView({
  c,
  postCount,
  statementCount,
  setStatementCount,
  onPitch,
  onShare,
  onEvidence,
  onBack,
  backLabel,
  devil,
  devilLoading,
  onDevil,
}: {
  c: Comparison;
  postCount: number;
  statementCount: number | null;
  setStatementCount: (n: number | null) => void;
  onPitch: () => void;
  onShare: () => void;
  onEvidence?: () => void;
  onBack: () => void;
  backLabel: string;
  devil?: Report;
  devilLoading: boolean;
  onDevil: () => void;
}) {
  const win = c.winner === "a" ? c.a : c.b;
  const margin = Math.abs(c.a.total - c.b.total);
  return (
    <div className="view compare">
      <header className="results-head">
        <div>
          <p className="eyebrow">Stop 03 · Compare · {postCount} posts weighed</p>
          <h2 className="section-title">
            Two ideas,<br /><em>one pick.</em>
          </h2>
        </div>
        <div className="chips">
          {onEvidence && <button className="btn small" onClick={onEvidence}>Inspect posts</button>}
          <button className="btn small" onClick={onShare}>Share</button>
          <button className="btn small link" onClick={onBack}>{backLabel}</button>
        </div>
      </header>

      <section className="verdict-banner ember-stage">
        <p className="eyebrow">The pick</p>
        <h3>{win.label}</h3>
        <p className="verdict-why">{c.why}</p>
        <p className="verdict-margin">
          Wins {Math.max(c.a.total, c.b.total)} to {Math.min(c.a.total, c.b.total)}
          {margin <= 6 ? ", a close call, so test the assumptions below before you commit." : "."}
        </p>
      </section>

      <div className="contenders">
        <Side s={c.a} tag="A" won={c.winner === "a"} />
        <Side s={c.b} tag="B" won={c.winner === "b"} />
      </div>

      <div className="val-grid">
        {c.wouldFlip.length > 0 && (
          <section className="val-sec">
            <h3>What would flip it</h3>
            <ul className="risks">{c.wouldFlip.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </section>
        )}
        {c.assumptions.length > 0 && (
          <section className="val-sec">
            <h3>Test these first</h3>
            <ol className="ticks">{c.assumptions.map((x, i) => <li key={i}>{x}</li>)}</ol>
          </section>
        )}
      </div>

      <section className="val-devil">
        {devil ? (
          <>
            <p className="eyebrow">Devil's advocate on the pick</p>
            <DevilReport report={devil} />
          </>
        ) : (
          <div className="devil-cta big">
            <div>
              <p className="eyebrow">Devil's advocate</p>
              <h3>Sure about “{win.label}”? Let the radar argue against it.</h3>
            </div>
            <button className="btn" onClick={onDevil} disabled={devilLoading}>
              {devilLoading ? "Building the case against…" : "Argue against the pick"}
            </button>
          </div>
        )}
      </section>

      <div className="val-cta">
        <CountControl label="Statements" value={statementCount} onChange={setStatementCount} min={1} max={6} autoStart={1} />
        <button className="btn primary big" onClick={onPitch}>
          Pitch the winner
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </div>
      <p className="fineprint spaced">Scores are AI judgements from the posts and your brief. Quotes are copied from real posts; evidence strength is counted, not guessed.</p>
    </div>
  );
}

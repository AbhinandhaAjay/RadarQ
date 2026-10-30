import type { Constraints, DevilReport as Report, Validation } from "@/lib/types";
import DevilReport from "./DevilReport";
import CountControl from "./CountControl";

const VERDICT: Record<Validation["verdict"], { word: string; note: string }> = {
  strong: { word: "Strong demand", note: "People are clearly asking for this." },
  some: { word: "Some demand", note: "There's a real pain here, but you'll need a sharp angle." },
  weak: { word: "Weak evidence", note: "We couldn't find many people describing this pain." },
};

function Gauge({ value }: { value: number }) {
  // Semicircle from 180° to 0°; the needle marks the demand score.
  const r = 80;
  const len = Math.PI * r;
  const a = Math.PI * (1 - value / 100);
  const nx = 100 + (r - 22) * Math.cos(a);
  const ny = 100 - (r - 22) * Math.sin(a);
  return (
    <svg className="gauge" viewBox="0 0 200 116" role="img" aria-label={`Demand score ${value} out of 100`}>
      <path d="M20 100 A80 80 0 0 1 180 100" className="g-track" />
      <path d="M20 100 A80 80 0 0 1 180 100" className="g-val" strokeDasharray={len} strokeDashoffset={len * (1 - value / 100)} />
      <line x1="100" y1="100" x2={nx} y2={ny} className="g-needle" />
      <circle cx="100" cy="100" r="5" className="g-hub" />
      <text x="100" y="64" textAnchor="middle" className="g-num">{value}</text>
    </svg>
  );
}

export default function ValidationReport({
  brief,
  v,
  postCount,
  statementCount,
  setStatementCount,
  onPitch,
  onEvidence,
  onShare,
  onAnother,
  devil,
  devilLoading,
  onDevil,
}: {
  brief: Constraints;
  v: Validation;
  postCount: number;
  statementCount: number | null;
  setStatementCount: (n: number | null) => void;
  onPitch: () => void;
  onEvidence: () => void;
  onShare: () => void;
  onAnother: () => void;
  devil?: Report;
  devilLoading: boolean;
  onDevil: () => void;
}) {
  const verdict = VERDICT[v.verdict];
  return (
    <div className="view validation">
      <header className="val-head">
        <div>
          <p className="eyebrow">Stop 03 · Verdict · {postCount} posts weighed</p>
          <blockquote className="val-idea">“{brief.idea}”</blockquote>
        </div>
        <div className="chips">
          <button className="btn small" onClick={onEvidence}>Inspect {postCount} posts</button>
          <button className="btn small" onClick={onShare}>Share</button>
          <button className="btn small link" onClick={onAnother}>Validate another idea</button>
        </div>
      </header>

      <section className={`val-verdict ember-stage ${v.verdict}`}>
        <Gauge value={v.demandScore} />
        <div>
          <h2>{verdict.word}</h2>
          <p className="val-headline">{v.headline || verdict.note}</p>
          <p className="muted">{v.summary}</p>
          <p className="eyebrow">{v.mentions} posts back this up</p>
        </div>
      </section>

      <div className="val-grid">
        <section className="val-sec">
          <h3>The pain, in their words</h3>
          <div className="val-quotes">
            {v.evidence.length ? (
              v.evidence.map((q, i) => (
                <figure key={i} className={`scrap s${(i % 3) + 1}`}>
                  <blockquote>“{q.text}”</blockquote>
                  <figcaption>
                    <span className={`sdot ${q.source}`} /> <a href={q.url} target="_blank" rel="noopener noreferrer">{q.community} ↗</a>
                  </figcaption>
                </figure>
              ))
            ) : (
              <p className="muted">No post described this pain closely enough to quote.</p>
            )}
          </div>
        </section>

        {v.painPoints.length > 0 && (
          <section className="val-sec">
            <h3>Pain points you'd solve</h3>
            <ol className="ticks">{v.painPoints.map((p, i) => <li key={i}>{p}</li>)}</ol>
          </section>
        )}

        <section className="val-sec">
          <h3>Who's already doing it</h3>
          {v.competitors.length ? (
            <>
              <ul className="tools">
                {v.competitors.map((c) => (
                  <li key={c.name}><b>{c.name}</b>{c.gap ? <span> lacks: {c.gap}</span> : null}</li>
                ))}
              </ul>
              <p className="fineprint">Suggested by AI from memory. Search each name before you rely on it.</p>
            </>
          ) : (
            <p><span className="stamp inline">open gap</span> No well-known product does exactly this.</p>
          )}
        </section>

        {v.risks.length > 0 && (
          <section className="val-sec">
            <h3>Honest risks</h3>
            <ul className="risks">{v.risks.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </section>
        )}

        {v.suggestedAngle && (
          <section className="val-sec angle">
            <h3>Sharpen it</h3>
            <p className="hand-big">{v.suggestedAngle}</p>
          </section>
        )}

        {v.pivots.length > 0 && (
          <section className="val-sec">
            <h3>If you'd rather pivot</h3>
            <ul className="risks">{v.pivots.map((p, i) => <li key={i}>{p}</li>)}</ul>
          </section>
        )}
      </div>

      <section className="val-devil">
        {devil ? (
          <>
            <p className="eyebrow">Devil's advocate</p>
            <DevilReport report={devil} />
          </>
        ) : (
          <div className="devil-cta big">
            <div>
              <p className="eyebrow">Devil's advocate</p>
              <h3>Think it's a good idea? Let the radar try to kill it.</h3>
              <p>It argues against your idea using the same posts, and marks which objections the evidence supports and which are its own guesses.</p>
            </div>
            <button className="btn" onClick={onDevil} disabled={devilLoading}>
              {devilLoading ? "Building the case against…" : "Kill my idea"}
            </button>
          </div>
        )}
      </section>

      <div className="val-cta">
        <CountControl label="Statements" value={statementCount} onChange={setStatementCount} min={1} max={6} autoStart={3} />
        <button className="btn primary big" onClick={onPitch}>
          Turn it into a pitch
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </div>
    </div>
  );
}

import type { DevilReport as Report } from "@/lib/types";

const VERDICT: Record<Report["verdict"], string> = {
  fragile: "Fragile",
  contested: "Contested",
  holds: "Holds up",
};

/** The case against a problem or idea, with every objection labelled by what backs it. */
export default function DevilReport({ report }: { report: Report }) {
  const backed = report.objections.filter((o) => o.basis === "evidence").length;
  return (
    <div className="devil ember-stage">
      <div className="devil-head">
        <span className={`devil-stamp ${report.verdict}`}>{VERDICT[report.verdict]}</span>
        <span className="devil-count">{backed} of {report.objections.length} objections backed by posts</span>
      </div>
      {report.headline && <p className="devil-headline">{report.headline}</p>}

      <ol className="objections">
        {report.objections.map((o, i) => (
          <li key={i} className={`objection ${o.basis}`}>
            <span className="obj-basis">{o.basis === "evidence" ? "Backed by posts" : "AI hypothesis"}</span>
            <h4>{o.point}</h4>
            {o.detail && <p>{o.detail}</p>}
            {o.quotes.map((q, j) => (
              <blockquote key={j} className={`quote ${q.source}`}>
                <p>“{q.text}”</p>
                <a href={q.url} target="_blank" rel="noopener noreferrer">{q.community} ↗</a>
              </blockquote>
            ))}
          </li>
        ))}
      </ol>

      <div className="devil-grid">
        {report.assumptions.length > 0 && (
          <div>
            <h5>Still unproven</h5>
            <ul>{report.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul>
          </div>
        )}
        {report.killCriteria.length > 0 && (
          <div>
            <h5>Drop it if you find</h5>
            <ul>{report.killCriteria.map((k, i) => <li key={i}>{k}</li>)}</ul>
          </div>
        )}
      </div>
      {report.recommendation && (
        <p className="devil-rec"><span className="hand">so…</span> {report.recommendation}</p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import type { Dictation, Statement } from "@/lib/types";
import WisprBadge from "./WisprBadge";

const TABS = ["Overview", "Evidence", "Build plan"] as const;

export default function StatementCard({
  s,
  index,
  onCopy,
  dictation,
  offline,
}: {
  s: Statement;
  index: number;
  onCopy: () => void;
  /** How the brief behind this pitch arrived. */
  dictation?: Dictation | null;
  /** Drafted from the evidence without the AI. */
  offline?: boolean;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");

  return (
    <article className="stmt" style={{ animationDelay: `${index * 0.08}s` }}>
      <div className="stmt-top">
        <div>
          <div className="mono-label">Pitch sheet {String(index + 1).padStart(2, "0")}{offline && " · drafted offline from the evidence"}</div>
          <WisprBadge d={dictation} prefix="Brief dictated with Wispr" />
          <h3>{s.name || s.title}</h3>
          {s.pitch && <p className="pitch">“{s.pitch}”</p>}
          {s.name && <p className="title">{s.title}</p>}
        </div>
        <button className="btn small no-print" onClick={onCopy}>Copy</button>
      </div>
      <div className="tabs no-print" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`tab ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="tab-body" key="o">
          <dl className="kv">
            <div><dt>Problem</dt><dd>{s.problem}</dd></div>
            <div><dt>Who faces it</dt><dd>{s.whoFaces}</dd></div>
            <div><dt>Proposed solution</dt><dd>{s.proposedSolution}</dd></div>
            <div><dt>Why it fits</dt><dd>{s.whyItFits}</dd></div>
          </dl>
        </div>
      )}
      {tab === "Evidence" && (
        <div className="tab-body" key="e">
          <dl className="kv">
            <div><dt>What the evidence shows</dt><dd><ul>{s.evidence.map((e, i) => <li key={i}>{e}</li>)}</ul></dd></div>
          </dl>
        </div>
      )}
      {tab === "Build plan" && (
        <div className="tab-body" key="b">
          <dl className="kv">
            <div>
              <dt>MVP features</dt>
              <dd><ul>{s.mvpFeatures.map((f, i) => <li key={i}>{f}</li>)}</ul></dd>
            </div>
            {s.buildPlan.length > 0 && (
              <div>
                <dt>Build plan</dt>
                <dd>
                  <ol className="timeline" style={{ marginTop: 10 }}>
                    {s.buildPlan.map((p, i) => (
                      <li key={i}>
                        <h4>{p.phase}</h4>
                        <ul>{p.tasks.map((t, j) => <li key={j}>{t}</li>)}</ul>
                      </li>
                    ))}
                  </ol>
                </dd>
              </div>
            )}
            {s.demoIdea && (
              <div className="demo-box"><b className="hand">the demo moment →</b> {s.demoIdea}</div>
            )}
          </dl>
        </div>
      )}

      {/* Printed / PDF version shows every section at once. */}
      <div className="tab-body print-only">
        <dl className="kv">
          <div><dt>Problem</dt><dd>{s.problem}</dd></div>
          <div><dt>Who faces it</dt><dd>{s.whoFaces}</dd></div>
          <div><dt>Evidence</dt><dd><ul>{s.evidence.map((e, i) => <li key={i}>{e}</li>)}</ul></dd></div>
          <div><dt>Proposed solution</dt><dd>{s.proposedSolution}</dd></div>
          <div><dt>MVP features</dt><dd><ul>{s.mvpFeatures.map((f, i) => <li key={i}>{f}</li>)}</ul></dd></div>
          <div><dt>Build plan</dt><dd><ul>{s.buildPlan.map((p, i) => <li key={i}><b>{p.phase}:</b> {p.tasks.join("; ")}</li>)}</ul></dd></div>
          {s.demoIdea && <div><dt>Demo moment</dt><dd>{s.demoIdea}</dd></div>}
          <div><dt>Why it fits</dt><dd>{s.whyItFits}</dd></div>
        </dl>
      </div>
    </article>
  );
}

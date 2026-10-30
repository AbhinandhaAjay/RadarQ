import Globe from "./Globe";
import type { Mode, Post, SourceId, SourceStatus } from "@/lib/types";
import { SOURCE_LABELS } from "@/lib/types";

export type ScanStage = "plan" | "fetch" | "analyze";

const ORDER: SourceId[] = ["reddit", "hackernews", "bluesky", "stackexchange"];

export default function ScanView({
  mode,
  stage,
  queries,
  posts,
  status,
  label,
}: {
  mode: Mode;
  stage: ScanStage;
  queries: string[];
  posts: Post[];
  status: Partial<Record<SourceId, SourceStatus>>;
  label: string;
}) {
  const idx = { plan: 0, fetch: 1, analyze: 2 }[stage];
  const stages = [
    "Writing focused searches from your brief",
    "Listening on Reddit, Hacker News, Bluesky, Stack Exchange",
    mode === "validate"
      ? "Weighing the evidence for your idea"
      : mode === "compare"
        ? "Scoring both ideas against your brief"
        : "Grouping posts into issues and scoring them",
  ];
  const feed = posts.slice(-9);

  return (
    <section className="scan view ember-stage">
      <div className="scan-globe">
        <Globe signals={posts.map((p) => ({ id: p.id, source: p.source }))} scanning label={`Globe showing ${posts.length} posts found`} />
      </div>
      <div className="scan-side">
        <p className="eyebrow">Stop 02 · Scanning · {label}</p>
        <h2 className="section-title">
          {posts.length ? <><span className="mono-num">{posts.length}</span> real posts<br /><em>overheard.</em></> : <>Tuning<br /><em>in…</em></>}
        </h2>
        <ol className="stages">
          {stages.map((s, i) => (
            <li key={s} className={`stage ${i === idx ? "now" : i < idx ? "ok" : ""}`}>
              <span className="sicon" aria-hidden="true">{i < idx ? "✓" : ""}</span>
              {s}
            </li>
          ))}
        </ol>
        <div className="sources">
          {ORDER.map((s) => {
            const st = status[s];
            return (
              <div key={s} className={`src ${st ? "done" : ""}`}>
                <span className="src-name"><span className={`sdot ${s}`} />{SOURCE_LABELS[s]}</span>
                <span className="src-num">{st ? String(st.count).padStart(2, "0") : stage === "plan" ? "--" : "··"}</span>
                {st?.note && <span className="src-note">{st.note}</span>}
              </div>
            );
          })}
        </div>
        <div className="feed" aria-hidden="true">
          <ul>
            {[...feed].reverse().map((p) => (
              <li key={p.id}>
                <span className={`feed-src ${p.source}`}>{p.source === "hackernews" ? "hn" : p.source === "stackexchange" ? "se" : p.source}</span>
                <span className="t">{p.title.startsWith("Post by") || p.title.startsWith("Comment") ? p.text.slice(0, 110) : p.title}</span>
              </li>
            ))}
          </ul>
        </div>
        {queries.length > 0 && (
          <p className="queries mono-label">searching: {queries.join(" · ")}</p>
        )}
      </div>
    </section>
  );
}

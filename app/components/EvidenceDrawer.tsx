"use client";

import { useMemo, useState } from "react";
import type { Issue, Post, SourceId } from "@/lib/types";
import { SOURCE_LABELS } from "@/lib/types";

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

/** Every post the scan pulled in, and which issues it backs. */
export default function EvidenceDrawer({
  posts,
  issues,
  rank,
  onOpenIssue,
}: {
  posts: Post[];
  issues: Issue[];
  rank: Map<string, number>;
  onOpenIssue: (id: string) => void;
}) {
  const [source, setSource] = useState<SourceId | "all">("all");
  const [q, setQ] = useState("");
  const [onlyCited, setOnlyCited] = useState(false);

  const backs = useMemo(() => {
    const m = new Map<string, Issue[]>();
    for (const i of issues) for (const id of i.postIds) m.set(id, [...(m.get(id) ?? []), i]);
    return m;
  }, [issues]);

  const sources = [...new Set(posts.map((p) => p.source))];
  const list = posts.filter(
    (p) =>
      (source === "all" || p.source === source) &&
      (!onlyCited || backs.has(p.id)) &&
      (!q.trim() || `${p.title} ${p.text} ${p.community}`.toLowerCase().includes(q.trim().toLowerCase()))
  );

  return (
    <div className="dr">
      <p className="eyebrow">Evidence explorer</p>
      <h2 className="dr-title">Every post we heard</h2>
      <p className="dr-lead">
        {posts.length} public posts, {backs.size} of them cited by an issue. Open any post to read it where it was written.
      </p>
      <div className="ev-tools">
        <input className="input" placeholder="Search posts…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search posts" />
        <div className="chips">
          <button className={`chip ${source === "all" ? "on" : ""}`} onClick={() => setSource("all")}>All</button>
          {sources.map((s) => (
            <button key={s} className={`chip ${source === s ? "on" : ""}`} onClick={() => setSource(s)}>
              <span className={`sdot ${s}`} /> {SOURCE_LABELS[s]}
            </button>
          ))}
          <button className={`chip ${onlyCited ? "on" : ""}`} onClick={() => setOnlyCited(!onlyCited)}>Cited only</button>
        </div>
      </div>
      <p className="eyebrow">{list.length} shown</p>
      <ul className="ev-list">
        {list.map((p) => {
          const issuesForPost = backs.get(p.id) ?? [];
          const body = p.title.startsWith("Post by") || p.title.startsWith("Comment") ? "" : p.title;
          return (
            <li key={p.id} className={`ev ${p.source}`}>
              <div className="ev-meta">
                <span className={`feed-src ${p.source}`}>{SOURCE_LABELS[p.source]}</span>
                <span>{p.community}</span>
                <span>{fmtDate(p.createdAt)}</span>
              </div>
              {body && <a className="ev-title" href={p.url} target="_blank" rel="noopener noreferrer">{body}</a>}
              <p className="ev-text">{p.text.slice(0, 260)}{p.text.length > 260 ? "…" : ""}</p>
              <div className="ev-foot">
                <a href={p.url} target="_blank" rel="noopener noreferrer">Open original ↗</a>
                {issuesForPost.map((i) => (
                  <button key={i.id} className="ev-issue" onClick={() => onOpenIssue(i.id)}>
                    backs #{rank.get(i.id)} {i.title.length > 38 ? `${i.title.slice(0, 38)}…` : i.title}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

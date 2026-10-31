// Packs a finished scan into the URL hash so teammates can open it without a backend.

import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import type { Comparison, Constraints, Dictation, Issue, Mode, Post, SourceId, SourceStatus, Statement, Validation } from "./types";
import { EMPTY_CONSTRAINTS } from "./types";

export interface SharedResult {
  v: 1;
  mode: Mode;
  brief: Constraints;
  queries: string[];
  status: Partial<Record<SourceId, SourceStatus>>;
  posts: Post[];
  issues: Issue[];
  statements: Statement[];
  validation: Validation | null;
  comparison: Comparison | null;
  /** How the brief arrived, so a shared pitch keeps its Wispr badge. */
  dictation?: Dictation | null;
}

const PREFIX = "#r=";

const trim = (posts: Post[], n: number) => posts.slice(0, n).map((p) => ({ ...p, text: p.text.slice(0, 180) }));

export function encodeShare(r: Omit<SharedResult, "v">): string {
  // A comparison carries its own posts per side, so the full scan list is
  // dropped from compare links to keep them short.
  const compareOnly = r.mode === "compare" && r.comparison;
  const payload: SharedResult = {
    v: 1,
    ...r,
    posts: compareOnly ? [] : trim(r.posts, 60),
    comparison: r.comparison ? { ...r.comparison, postsA: trim(r.comparison.postsA, 12), postsB: trim(r.comparison.postsB, 12) } : null,
  };
  return `${location.origin}${location.pathname}${PREFIX}${compressToEncodedURIComponent(JSON.stringify(payload))}`;
}

export function decodeShare(hash: string): SharedResult | null {
  if (!hash.startsWith(PREFIX)) return null;
  try {
    const json = decompressFromEncodedURIComponent(hash.slice(PREFIX.length));
    if (!json) return null;
    const r = JSON.parse(json) as SharedResult;
    if (r.v !== 1 || !Array.isArray(r.issues)) return null;
    if (r.comparison) {
      r.comparison.postsA = r.comparison.postsA ?? [];
      r.comparison.postsB = r.comparison.postsB ?? [];
    }
    return {
      ...r,
      brief: { ...EMPTY_CONSTRAINTS, ...r.brief },
      posts: r.posts ?? [],
      statements: r.statements ?? [],
      validation: r.validation ?? null,
      comparison: r.comparison ?? null,
      queries: r.queries ?? [],
      status: r.status ?? {},
    };
  } catch {
    return null;
  }
}

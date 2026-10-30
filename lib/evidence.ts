// Turns model-cited post ids and quotes into evidence the UI can trust.

import type { Post, Quote } from "./types";

export interface RawQuote {
  postId?: string;
  text?: string;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function excerpt(p: Post): string {
  const t = p.text || p.title;
  return t.length > 200 ? `${t.slice(0, 200).trim()}…` : t;
}

/**
 * Keep only evidence that points at real fetched posts. A quote the model
 * paraphrased (not found in its post) is replaced by the post's own text,
 * so every quote shown to the user is genuine.
 */
export function collectEvidence(
  evidenceIds: string[] | undefined,
  rawQuotes: RawQuote[] | undefined,
  byId: Map<string, Post>,
  maxQuotes = 3,
  minQuotes = 2
): { ids: string[]; quotes: Quote[] } {
  const ids = new Set<string>();
  for (const id of evidenceIds ?? []) if (byId.has(id)) ids.add(id);
  for (const q of rawQuotes ?? []) if (q.postId && byId.has(q.postId)) ids.add(q.postId);

  const quotes: Quote[] = [];
  const quoted = new Set<string>();
  for (const q of rawQuotes ?? []) {
    const post = q.postId ? byId.get(q.postId) : undefined;
    if (!post || quoted.has(post.id)) continue;
    const genuine = q.text && norm(post.title + " " + post.text).includes(norm(q.text));
    quotes.push({ text: genuine ? q.text!.trim() : excerpt(post), url: post.url, source: post.source, community: post.community });
    quoted.add(post.id);
    if (quotes.length >= maxQuotes) break;
  }
  for (const id of ids) {
    if (quotes.length >= minQuotes) break;
    if (quoted.has(id)) continue;
    const post = byId.get(id)!;
    quotes.push({ text: excerpt(post), url: post.url, source: post.source, community: post.community });
    quoted.add(id);
  }
  return { ids: [...ids], quotes };
}

export interface EvidenceStrength {
  score: number;
  label: "Strong" | "Moderate" | "Thin";
  posts: number;
  communities: number;
  platforms: number;
  recent: number;
  newest: string | null;
  oldest: string | null;
  spanDays: number;
  flags: string[];
  dated: Post[];
}

const DAY = 24 * 3600 * 1000;

/**
 * How much to trust an issue, from the cited posts alone: independent
 * communities and platforms count more than raw volume, and recent posts
 * count more than old ones. No AI involved.
 */
export function evidenceStrength(postIds: string[], posts: Post[]): EvidenceStrength {
  const byId = new Map(posts.map((p) => [p.id, p]));
  const cited = postIds.map((id) => byId.get(id)).filter((p): p is Post => Boolean(p));
  const dated = cited
    .filter((p) => !Number.isNaN(Date.parse(p.createdAt)))
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const communities = new Set(cited.map((p) => p.community)).size;
  const platforms = new Set(cited.map((p) => p.source)).size;
  const now = Date.now();
  const recent = dated.filter((p) => now - Date.parse(p.createdAt) <= 90 * DAY).length;
  const newest = dated.length ? dated[dated.length - 1].createdAt : null;
  const oldest = dated.length ? dated[0].createdAt : null;
  const spanDays = newest && oldest ? Math.round((Date.parse(newest) - Date.parse(oldest)) / DAY) : 0;

  const diversity = Math.min(communities, 4) / 4;
  const spread = Math.min(platforms, 3) / 3;
  const freshness = dated.length ? recent / dated.length : 0;
  const volume = Math.min(cited.length, 6) / 6;
  const score = Math.round(100 * (0.35 * diversity + 0.25 * spread + 0.2 * freshness + 0.2 * volume));
  const label = score >= 60 ? "Strong" : score >= 35 ? "Moderate" : "Thin";

  const flags: string[] = [];
  if (cited.length <= 1) flags.push("Only one post mentions this");
  else if (communities === 1) flags.push("Every post comes from one community");
  if (platforms === 1 && cited.length > 1) flags.push("Seen on one platform only");
  if (newest && now - Date.parse(newest) > 365 * DAY) flags.push("Nothing from the last year");
  if (spanDays >= 180) flags.push(`Raised over ${Math.round(spanDays / 30)} months, so it's persistent`);
  if (recent >= 2) flags.push(`${recent} posts in the last 90 days`);

  return { score, label, posts: cited.length, communities, platforms, recent, newest, oldest, spanDays, flags, dated };
}

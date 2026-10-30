// Fetchers for public discussion sources. Each returns normalized posts and
// never throws past searchAll, so one failing source doesn't break a search.

import type { Post, SourceId, SourceStatus } from "./types";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36 RadarQ/0.1";
const YEAR = 365 * 24 * 3600;
const TIMEOUT_MS = 12000;

// Stack Exchange sites the AI may choose from, beyond programming.
export const STACK_SITES = [
  "softwarerecs",
  "stackoverflow",
  "superuser",
  "webapps",
  "workplace",
  "academia",
  "money",
  "freelancing",
  "parenting",
  "ux",
  "pm",
  "travel",
  "cooking",
  "diy",
  "law",
  "sustainability",
  "datascience",
];

const SITE_NAMES: Record<string, string> = {
  softwarerecs: "Software Recommendations SE",
  stackoverflow: "Stack Overflow",
  superuser: "Super User",
  webapps: "Web Applications SE",
  workplace: "The Workplace SE",
  academia: "Academia SE",
  money: "Personal Finance SE",
  freelancing: "Freelancing SE",
  parenting: "Parenting SE",
  ux: "UX SE",
  pm: "Project Management SE",
};

function clean(s: string | undefined | null): string {
  if (!s) return "";
  return s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\[link\]|\[comments\]|submitted by \/u\/\S+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function get(url: string, accept = "application/json"): Promise<Response> {
  const res = await fetch(url, {
    headers: { "User-Agent": BROWSER_UA, Accept: accept },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (res.status === 429) throw new Error("rate limited");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

const iso = (sec: number) => new Date(sec * 1000).toISOString();

// Reddit blocks most unauthenticated API access, so this uses its public RSS
// search and is best-effort.
async function redditOne(q: string): Promise<Post[]> {
  const res = await get(
    `https://www.reddit.com/search.rss?q=${encodeURIComponent(q)}&sort=relevance&t=year&limit=15`,
    "application/atom+xml"
  );
  const xml = await res.text();
  return xml
    .split("<entry>")
    .slice(1)
    .map((entry): Post | null => {
      const tag = (t: string) => entry.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`))?.[1] ?? "";
      const url = entry.match(/<link href="([^"]+)"/)?.[1];
      if (!url) return null;
      const sub = entry.match(/<category term="([^"]+)"/)?.[1] ?? "reddit";
      return {
        id: `rd_${url.match(/comments\/([a-z0-9]+)/)?.[1] ?? Math.random().toString(36).slice(2, 8)}`,
        source: "reddit",
        title: clean(tag("title")),
        text: clean(tag("content")),
        url,
        community: `r/${sub}`,
        score: 0,
        createdAt: tag("updated") || tag("published"),
      };
    })
    .filter((p): p is Post => p !== null);
}

async function hackerNewsOne(q: string): Promise<Post[]> {
  const after = Math.floor(Date.now() / 1000) - 4 * YEAR;
  const res = await get(
    `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=(story,comment)&hitsPerPage=20&numericFilters=created_at_i>${after}`
  );
  const json = await res.json();
  return (json.hits ?? []).map((h: any): Post => {
    const isComment = Boolean(h.comment_text);
    return {
      id: `hn_${h.objectID}`,
      source: "hackernews",
      title: clean(isComment ? `Comment on: ${h.story_title ?? "HN thread"}` : h.title),
      text: clean(isComment ? h.comment_text : h.story_text),
      url: `https://news.ycombinator.com/item?id=${h.objectID}`,
      community: "Hacker News",
      score: h.points ?? 0,
      createdAt: h.created_at,
    };
  });
}

async function blueskyOne(q: string): Promise<Post[]> {
  const res = await get(
    `https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(q)}&limit=25&sort=top&lang=en`
  );
  const json = await res.json();
  return (json.posts ?? []).map((p: any): Post => {
    const rkey = String(p.uri).split("/").pop();
    return {
      id: `bs_${rkey}`,
      source: "bluesky",
      title: `Post by @${p.author?.handle}`,
      text: clean(p.record?.text),
      url: `https://bsky.app/profile/${p.author?.handle}/post/${rkey}`,
      community: "Bluesky",
      score: (p.likeCount ?? 0) + (p.replyCount ?? 0),
      createdAt: p.indexedAt,
    };
  });
}

async function stackExchangeOne(q: string, site: string): Promise<Post[]> {
  const res = await get(
    `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(q)}&site=${site}&pagesize=5&filter=withbody`
  );
  const json = await res.json();
  return (json.items ?? []).map(
    (it: any): Post => ({
      id: `se_${site}_${it.question_id}`,
      source: "stackexchange",
      title: clean(it.title),
      text: clean(it.body),
      url: it.link,
      community: SITE_NAMES[site] ?? `${site} SE`,
      score: it.score ?? 0,
      createdAt: iso(it.creation_date),
    })
  );
}

const STOPWORDS = new Set(["with", "from", "that", "this", "your", "their", "about", "into", "small", "best", "tool", "tools", "using", "online", "system"]);

// Short prefixes so "reminder" matches "reminders" and "remind".
function stems(query: string): string[] {
  const words = query.toLowerCase().split(/[^a-z0-9]+/);
  return [...new Set(words.filter((w) => w.length >= 4 && !STOPWORDS.has(w)).map((w) => w.slice(0, 5)))];
}

/**
 * Best share of any one query's terms found in the post's title and opening
 * text. Long posts mention everything eventually, so only the start counts.
 */
function relevance(p: Post, queryStems: string[][]): number {
  const hay = `${p.title} ${p.text.slice(0, 700)}`.toLowerCase();
  let best = 0;
  for (const terms of queryStems) {
    if (!terms.length) continue;
    const hits = terms.filter((t) => hay.includes(t)).length;
    if (hits >= Math.min(2, terms.length)) best = Math.max(best, hits / terms.length);
  }
  return best;
}

/** Keep posts that clearly match a query, most relevant first, deduped by URL. */
function pick(lists: Post[][], queryStems: string[][], cap: number): Post[] {
  const seen = new Set<string>();
  return lists
    .flat()
    .map((p) => ({ p, r: relevance(p, queryStems) }))
    .filter(({ p, r }) => r >= 0.66 && (p.title + p.text).length >= 60)
    .sort((a, b) => b.r - a.r || b.p.score - a.p.score)
    .filter(({ p }) => (seen.has(p.url) ? false : (seen.add(p.url), true)))
    .slice(0, cap)
    .map(({ p }) => p);
}

function tasksFor(source: SourceId, queries: string[], stackSites: string[]): (() => Promise<Post[]>)[] {
  switch (source) {
    case "reddit":
      // Reddit rate-limits quickly: two queries, one after the other.
      return [
        async () => [
          ...(await redditOne(queries[0])),
          ...(queries[1] ? await redditOne(queries[1]).catch(() => []) : []),
        ],
      ];
    case "hackernews":
      return queries.map((q) => () => hackerNewsOne(q));
    case "bluesky":
      return queries.map((q) => () => blueskyOne(q));
    case "stackexchange": {
      const sites = stackSites.filter((s) => STACK_SITES.includes(s)).slice(0, 2);
      if (!sites.length) sites.push("softwarerecs");
      return queries.slice(0, 3).flatMap((q) => sites.map((site) => () => stackExchangeOne(q, site)));
    }
  }
}

export const SOURCES: SourceId[] = ["reddit", "hackernews", "bluesky", "stackexchange"];

/** Search one source with every query. Never throws; failures land in status. */
export async function searchSource(
  source: SourceId,
  queries: string[],
  stackSites: string[],
  cap = 14
): Promise<{ posts: Post[]; status: SourceStatus }> {
  const settled = await Promise.allSettled(tasksFor(source, queries, stackSites).map((t) => t()));
  const failed = settled.filter((s): s is PromiseRejectedResult => s.status === "rejected");
  const posts = pick(
    settled.map((s) => (s.status === "fulfilled" ? s.value : [])),
    queries.map(stems),
    cap
  );
  let note: string | undefined;
  if (failed.length === settled.length) {
    note = /rate limited|403|429/.test(String(failed[0]?.reason))
      ? "Blocking automated searches right now"
      : "Unavailable right now";
  }
  return { posts, status: { source, ok: failed.length < settled.length, count: posts.length, note } };
}

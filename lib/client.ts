// Browser-side helpers shared by the UI components.

import type { Constraints, Dictation, Post, SourceId, Statement } from "./types";
import { isEmptyConstraints } from "./types";
import { dictationLabel, isWispr } from "./wispr";

export async function post<T>(url: string, body: unknown): Promise<T> {
  const send = () =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  let res: Response;
  try {
    res = await send();
  } catch {
    // A dropped connection (server restarting, flaky wifi) gets one quiet retry.
    await new Promise((r) => setTimeout(r, 1500));
    try {
      res = await send();
    } catch {
      throw new Error("Couldn't reach RadarQ. Check your internet connection and try again.");
    }
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

/** Stable 0..1 value from a string, for placing blips and jitter. */
export function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/** Round-robin posts across sources so no single source dominates the analysis. */
export function interleave(posts: Post[]): Post[] {
  const groups = new Map<SourceId, Post[]>();
  for (const p of posts) groups.set(p.source, [...(groups.get(p.source) ?? []), p]);
  const lists = [...groups.values()];
  const out: Post[] = [];
  for (let i = 0; lists.some((l) => i < l.length); i++) for (const l of lists) if (l[i]) out.push(l[i]);
  return out;
}

export function briefLabel(c: Constraints): string {
  if (isEmptyConstraints(c)) return "Today's top issues";
  return c.name || c.theme || c.track || "Custom search";
}

export function toMarkdown(c: Constraints, statements: Statement[], dictation?: Dictation | null): string {
  const voice = isWispr(dictation)
    ? `\n_Brief ${dictation.simulated ? "replayed from a saved Wispr Flow dictation" : "dictated with Wispr Flow"}: ${dictationLabel(dictation)}_\n`
    : "";
  const head = `# Problem statements${c.name ? ` for ${c.name}` : ""}\n${c.theme ? `\nTheme: ${c.theme}\n` : ""}${voice}`;
  const body = statements
    .map(
      (s, i) => `## ${i + 1}. ${s.name ? `${s.name}: ` : ""}${s.title}

> ${s.pitch}

**Problem:** ${s.problem}

**Who faces it:** ${s.whoFaces}

**Evidence:**
${s.evidence.map((e) => `- ${e}`).join("\n")}

**Proposed solution:** ${s.proposedSolution}

**MVP features:**
${s.mvpFeatures.map((f) => `- ${f}`).join("\n")}

**Build plan:**
${s.buildPlan.map((p) => `- **${p.phase}:** ${p.tasks.join("; ")}`).join("\n")}

**Demo moment:** ${s.demoIdea}

**Why it fits:** ${s.whyItFits}
`
    )
    .join("\n");
  return `${head}\n${body}\n_Generated with RadarQ_\n`;
}

// ---------- Recent searches (per-browser convenience only) ----------

export interface RecentSearch {
  label: string;
  brief: Constraints;
  at: number;
}

const RECENT_KEY = "radarq:recent";

export function loadRecent(): RecentSearch[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const list = raw ? (JSON.parse(raw) as RecentSearch[]) : [];
    return Array.isArray(list) ? list.slice(0, 6) : [];
  } catch {
    return [];
  }
}

export function saveRecent(brief: Constraints): RecentSearch[] {
  const label = briefLabel(brief);
  const list = [{ label, brief, at: Date.now() }, ...loadRecent().filter((r) => r.label !== label)].slice(0, 6);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // Storage can be unavailable (private mode); recent searches are optional.
  }
  return list;
}

import { NextResponse } from "next/server";
import { chatJSON } from "@/lib/groq";
import { analyzeSystem, analyzeUser } from "@/lib/prompts";
import { collectEvidence } from "@/lib/evidence";
import type { Constraints, Issue, Post, SourceId } from "@/lib/types";

export const maxDuration = 60;

interface RawIssue {
  title?: string;
  summary?: string;
  affected?: string;
  painScore?: number;
  painReason?: string;
  fitScore?: number;
  fitReason?: string;
  evidenceIds?: string[];
  quotes?: { postId?: string; text?: string }[];
  existingTools?: { name?: string; gap?: string }[];
}

const clamp = (n: unknown, lo: number, hi: number, fallback: number) =>
  typeof n === "number" && Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : fallback;

/**
 * Opportunity: pain and fit weigh most, repeated mentions add confidence,
 * and each known competitor makes the gap smaller.
 */
function opportunity(pain: number, fit: number, mentions: number, tools: number): number {
  const p = (pain - 1) / 4;
  const f = fit / 100;
  const m = Math.min(1, Math.log2(1 + mentions) / 3);
  const toolPenalty = 1 - Math.min(3, tools) * 0.08;
  return Math.round(100 * (0.42 * p + 0.42 * f + 0.16 * m) * toolPenalty);
}

function toIssue(raw: RawIssue, index: number, byId: Map<string, Post>): Issue | null {
  const { ids, quotes } = collectEvidence(raw.evidenceIds, raw.quotes, byId);
  if (!ids.length || !raw.title) return null;

  const sources = [...new Set(ids.map((id) => byId.get(id)!.source))] as SourceId[];
  const painScore = clamp(raw.painScore, 1, 5, 3);
  const fitScore = clamp(raw.fitScore, 0, 100, 50);
  const existingTools = (raw.existingTools ?? [])
    .filter((t) => t.name)
    .slice(0, 3)
    .map((t) => ({ name: t.name!, gap: t.gap ?? "" }));
  return {
    id: `issue_${index}`,
    title: raw.title,
    summary: raw.summary ?? "",
    affected: raw.affected ?? "",
    painScore,
    painReason: raw.painReason ?? "",
    fitScore,
    fitReason: raw.fitReason ?? "",
    mentions: ids.length,
    postIds: ids,
    opportunity: opportunity(painScore, fitScore, ids.length, existingTools.length),
    sources,
    quotes,
    existingTools,
  };
}

export async function POST(req: Request) {
  try {
    const { constraints, posts, issueCount } = (await req.json()) as {
      constraints: Constraints;
      posts: Post[];
      issueCount?: number | null;
    };
    const count = issueCount ? Math.min(12, Math.max(3, Math.round(issueCount))) : null;
    if (!posts?.length) {
      return NextResponse.json({ error: "No posts were found to analyze. Try a broader theme." }, { status: 400 });
    }
    const byId = new Map(posts.map((p) => [p.id, p]));
    const ai = await chatJSON<{ issues?: RawIssue[] }>(
      analyzeSystem(count),
      analyzeUser(constraints, posts.slice(0, 48)),
      count && count > 8 ? 7000 : 5000
    );
    const issues = (ai.issues ?? [])
      .map((raw, i) => toIssue(raw, i, byId))
      .filter((i): i is Issue => i !== null)
      .sort((a, b) => b.opportunity - a.opportunity || b.mentions - a.mentions)
      .slice(0, count ?? 12);
    return NextResponse.json({ issues });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

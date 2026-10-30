import { NextResponse } from "next/server";
import { chatJSON } from "@/lib/groq";
import { collectEvidence, evidenceStrength, type RawQuote } from "@/lib/evidence";
import { COMPARE_SYSTEM, compareUser } from "@/lib/prompts";
import type { Comparison, Constraints, Contender, ContenderScore } from "@/lib/types";

export const maxDuration = 60;

interface RawSide {
  pain?: number;
  evidence?: number;
  competition?: number;
  fit?: number;
  buildability?: number;
  strengths?: string[];
  weaknesses?: string[];
  evidenceIds?: string[];
  quotes?: RawQuote[];
}

const score = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? Math.min(10, Math.max(1, Math.round(n))) : 5);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.map(String).filter(Boolean).slice(0, 3) : []);

function side(raw: RawSide | undefined, c: Contender): ContenderScore {
  const posts = c.posts.slice(0, 24);
  const byId = new Map(posts.map((p) => [p.id, p]));
  const { ids, quotes } = collectEvidence(raw?.evidenceIds, raw?.quotes, byId, 2, 1);
  const strength = evidenceStrength(ids, posts);
  const s = {
    pain: score(raw?.pain),
    evidence: score(raw?.evidence),
    competition: score(raw?.competition),
    fit: score(raw?.fit),
    buildability: score(raw?.buildability),
  };
  const total = Math.round(((s.pain + s.evidence + (10 - s.competition) + s.fit + s.buildability) / 49) * 100);
  return {
    label: c.label,
    description: c.description,
    ...s,
    total,
    strength: strength.score,
    strengthLabel: strength.label,
    strengths: strings(raw?.strengths),
    weaknesses: strings(raw?.weaknesses),
    quotes: quotes.length ? quotes : (c.quotes ?? []).slice(0, 2),
  };
}

export async function POST(req: Request) {
  try {
    const { constraints, a, b } = (await req.json()) as { constraints: Constraints; a: Contender; b: Contender };
    if (!a?.label || !b?.label) return NextResponse.json({ error: "Two ideas are needed to compare." }, { status: 400 });
    const trimmed = (x: Contender): Contender => ({ ...x, posts: (x.posts ?? []).slice(0, 24) });
    const ai = await chatJSON<{ a?: RawSide; b?: RawSide; winner?: string; why?: string; wouldFlip?: string[]; assumptions?: string[] }>(
      COMPARE_SYSTEM,
      compareUser(constraints, trimmed(a), trimmed(b)),
      3500
    );
    const sa = side(ai.a, a);
    const sb = side(ai.b, b);
    // The winner follows the scores, so the verdict never contradicts the bars.
    const winner: Comparison["winner"] = sa.total === sb.total ? (ai.winner === "b" ? "b" : "a") : sa.total > sb.total ? "a" : "b";
    const comparison: Comparison = {
      a: sa,
      b: sb,
      winner,
      why: ai.why ?? "",
      wouldFlip: strings(ai.wouldFlip),
      assumptions: strings(ai.assumptions),
      postsA: a.posts ?? [],
      postsB: b.posts ?? [],
    };
    return NextResponse.json({ comparison });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

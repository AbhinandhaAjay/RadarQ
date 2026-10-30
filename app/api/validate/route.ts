import { NextResponse } from "next/server";
import { chatJSON } from "@/lib/groq";
import { collectEvidence, type RawQuote } from "@/lib/evidence";
import { analyzeUser, VALIDATE_SYSTEM } from "@/lib/prompts";
import type { Constraints, Post, Validation } from "@/lib/types";

export const maxDuration = 60;

interface RawValidation {
  verdict?: string;
  demandScore?: number;
  headline?: string;
  summary?: string;
  painPoints?: string[];
  evidenceIds?: string[];
  quotes?: RawQuote[];
  competitors?: { name?: string; gap?: string }[];
  risks?: string[];
  suggestedAngle?: string;
  pivots?: string[];
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);

export async function POST(req: Request) {
  try {
    const { constraints, posts } = (await req.json()) as { constraints: Constraints; posts: Post[] };
    if (!constraints?.idea?.trim()) {
      return NextResponse.json({ error: "Describe the idea you want to validate first." }, { status: 400 });
    }
    if (!posts?.length) {
      return NextResponse.json({ error: "No posts were found for this idea. Try describing the problem more broadly." }, { status: 400 });
    }
    const byId = new Map(posts.map((p) => [p.id, p]));
    const ai = await chatJSON<RawValidation>(VALIDATE_SYSTEM, analyzeUser(constraints, posts.slice(0, 48)), 4000);

    const { ids, quotes } = collectEvidence(ai.evidenceIds, ai.quotes, byId, 4, 2);
    // Without genuine evidence the verdict cannot be "strong", whatever the model said.
    let verdict: Validation["verdict"] = ai.verdict === "strong" || ai.verdict === "some" ? ai.verdict : "weak";
    if (ids.length < 2 && verdict === "strong") verdict = "some";
    if (ids.length === 0) verdict = "weak";
    const raw = typeof ai.demandScore === "number" && Number.isFinite(ai.demandScore) ? ai.demandScore : 40;
    const band = { strong: [65, 100], some: [35, 70], weak: [0, 40] }[verdict];
    const demandScore = Math.round(Math.min(band[1], Math.max(band[0], raw)));

    const validation: Validation = {
      verdict,
      demandScore,
      headline: ai.headline ?? "",
      summary: ai.summary ?? "",
      painPoints: strings(ai.painPoints).slice(0, 4),
      evidence: quotes,
      mentions: ids.length,
      postIds: ids,
      competitors: (ai.competitors ?? []).filter((c) => c.name).slice(0, 4).map((c) => ({ name: c.name!, gap: c.gap ?? "" })),
      risks: strings(ai.risks).slice(0, 3),
      suggestedAngle: ai.suggestedAngle ?? "",
      pivots: strings(ai.pivots).slice(0, 2),
    };
    return NextResponse.json({ validation });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

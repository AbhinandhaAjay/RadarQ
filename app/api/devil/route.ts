import { NextResponse } from "next/server";
import { chatJSON } from "@/lib/groq";
import { collectEvidence, type RawQuote } from "@/lib/evidence";
import { DEVIL_SYSTEM, devilUser } from "@/lib/prompts";
import type { Constraints, DevilObjection, DevilReport, Post } from "@/lib/types";

export const maxDuration = 60;

interface RawReport {
  verdict?: string;
  headline?: string;
  objections?: { point?: string; detail?: string; basis?: string; postIds?: string[]; quotes?: RawQuote[] }[];
  assumptions?: string[];
  killCriteria?: string[];
  recommendation?: string;
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);

export async function POST(req: Request) {
  try {
    const { constraints, target, posts } = (await req.json()) as {
      constraints: Constraints;
      target: { title: string; summary: string; tools: string[] };
      posts: Post[];
    };
    if (!target?.title) return NextResponse.json({ error: "Nothing to argue against." }, { status: 400 });
    const usable = (posts ?? []).slice(0, 30);
    const byId = new Map(usable.map((p) => [p.id, p]));
    const ai = await chatJSON<RawReport>(DEVIL_SYSTEM, devilUser(constraints, target, usable), 3500);

    // An objection only counts as evidence-backed if it points at real fetched posts.
    const objections: DevilObjection[] = (ai.objections ?? [])
      .filter((o) => o.point)
      .slice(0, 5)
      .map((o) => {
        const { ids, quotes } = collectEvidence(o.postIds, o.quotes, byId, 2, 1);
        const backed = o.basis === "evidence" && ids.length > 0;
        return { point: o.point!, detail: o.detail ?? "", basis: backed ? "evidence" : "hypothesis", quotes: backed ? quotes : [] };
      });
    const verdict: DevilReport["verdict"] = ai.verdict === "fragile" || ai.verdict === "holds" ? ai.verdict : "contested";

    const report: DevilReport = {
      verdict,
      headline: ai.headline ?? "",
      objections,
      assumptions: strings(ai.assumptions).slice(0, 4),
      killCriteria: strings(ai.killCriteria).slice(0, 3),
      recommendation: ai.recommendation ?? "",
    };
    return NextResponse.json({ report });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

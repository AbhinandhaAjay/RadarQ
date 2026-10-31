import { NextResponse } from "next/server";
import { chatJSON } from "@/lib/groq";
import { statementSystem, statementUser } from "@/lib/prompts";
import type { BuildPhase, Constraints, Issue, Statement } from "@/lib/types";

export const maxDuration = 60;

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);

export async function POST(req: Request) {
  try {
    const { constraints, issues, statementCount } = (await req.json()) as {
      constraints: Constraints;
      issues: Issue[];
      statementCount?: number | null;
    };
    if (!issues?.length) {
      return NextResponse.json({ error: "Select at least one issue first." }, { status: 400 });
    }
    // "Auto" means one pitch sheet per chosen issue.
    const count = Math.min(6, Math.max(1, Math.round(statementCount || issues.length)));
    const ai = await chatJSON<{ statements?: Partial<Statement>[] }>(
      statementSystem(count),
      statementUser(constraints, issues.slice(0, 8)),
      Math.min(8000, 1400 * count + 1000)
    );
    const statements: Statement[] = (ai.statements ?? []).slice(0, count).map((s) => ({
      name: s.name ?? "",
      pitch: s.pitch ?? "",
      title: s.title ?? "Untitled",
      problem: s.problem ?? "",
      whoFaces: s.whoFaces ?? "",
      evidence: strings(s.evidence),
      proposedSolution: s.proposedSolution ?? "",
      mvpFeatures: strings(s.mvpFeatures),
      buildPlan: (Array.isArray(s.buildPlan) ? s.buildPlan : [])
        .filter((p): p is BuildPhase => Boolean(p && typeof p === "object" && (p as BuildPhase).phase))
        .map((p) => ({ phase: String(p.phase), tasks: strings(p.tasks) })),
      demoIdea: s.demoIdea ?? "",
      whyItFits: s.whyItFits ?? "",
    }));
    return NextResponse.json({ statements });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

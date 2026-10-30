import { NextResponse } from "next/server";
import { chatJSON } from "@/lib/groq";
import { describeConstraints, QUERY_SYSTEM, VALIDATE_QUERY_SYSTEM } from "@/lib/prompts";
import { searchSource, SOURCES } from "@/lib/sources";
import type { Constraints, Mode, SourceId } from "@/lib/types";

export const maxDuration = 60;

type Body =
  | { phase: "plan"; constraints: Constraints; mode?: Mode }
  | { phase: "fetch"; source: SourceId; queries: string[]; stackSites: string[]; cap?: number };

// Two phases so the client can animate each source as it returns:
// "plan" turns constraints into queries, "fetch" searches one source.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    if (body.phase === "plan") {
      const ai = await chatJSON<{ queries?: string[]; stackSites?: string[]; angle?: string }>(
        body.mode === "validate" ? VALIDATE_QUERY_SYSTEM : QUERY_SYSTEM,
        describeConstraints(body.constraints),
        800
      );
      const queries = (ai.queries ?? [])
        .map((q) => String(q).replace(/["']/g, "").trim())
        .filter(Boolean)
        .slice(0, 4);
      if (!queries.length) queries.push(body.constraints.theme?.trim() || body.constraints.idea?.trim().split(/\s+/).slice(0, 4).join(" ") || "wish there was an app");
      return NextResponse.json({ queries, stackSites: (ai.stackSites ?? []).map(String), angle: ai.angle ?? "" });
    }

    if (body.phase === "fetch") {
      if (!SOURCES.includes(body.source)) {
        return NextResponse.json({ error: "Unknown source" }, { status: 400 });
      }
      const cap = Math.min(20, Math.max(6, Number(body.cap) || 14));
      const result = await searchSource(body.source, body.queries.slice(0, 4), body.stackSites ?? [], cap);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown phase" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

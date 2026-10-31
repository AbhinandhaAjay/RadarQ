import { NextResponse } from "next/server";
import { chatJSON } from "@/lib/groq";
import { rambleSystem, rambleUser } from "@/lib/prompts";
import type { Constraints, Mode, Pulled } from "@/lib/types";
import { EMPTY_CONSTRAINTS } from "@/lib/types";

export const maxDuration = 60;

const FIELDS = Object.keys(EMPTY_CONSTRAINTS) as (keyof Constraints)[];

/** One long Wispr dictation in, a filled brief and a "you said → it became" map out. */
export async function POST(req: Request) {
  try {
    const { text, brief, mode } = (await req.json()) as { text: string; brief: Constraints; mode?: Mode };
    if (!text?.trim()) return NextResponse.json({ error: "Nothing was dictated yet" }, { status: 400 });

    const current = { ...EMPTY_CONSTRAINTS, ...brief };
    const ai = await chatJSON<{ brief?: Partial<Constraints>; pulled?: unknown[]; reply?: string }>(
      rambleSystem(mode ?? "find"),
      rambleUser(text, current),
      2000
    );

    const merged: Constraints = { ...current };
    for (const key of FIELDS) {
      const v = ai.brief?.[key];
      if (typeof v === "string" && v.trim()) merged[key] = v.trim();
    }
    const pulled: Pulled[] = (ai.pulled ?? [])
      .map((p) => p as Record<string, unknown>)
      .filter((p) => FIELDS.includes(p.field as keyof Constraints) && typeof p.said === "string" && typeof p.became === "string")
      .map((p) => ({ field: p.field as keyof Constraints, said: String(p.said).slice(0, 160), became: String(p.became).slice(0, 160) }))
      .slice(0, 11);

    return NextResponse.json({ brief: merged, pulled, reply: ai.reply || "Got it. Start the scan whenever you're ready." });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

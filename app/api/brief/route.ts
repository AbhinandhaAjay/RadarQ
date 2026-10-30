import { NextResponse } from "next/server";
import { chatJSON } from "@/lib/groq";
import { fetchPageText, findUrl } from "@/lib/page";
import { briefSystem, briefUser } from "@/lib/prompts";
import type { ChatMessage, Constraints, Mode } from "@/lib/types";
import { EMPTY_CONSTRAINTS } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages, brief, mode } = (await req.json()) as { messages: ChatMessage[]; brief: Constraints; mode?: Mode };
    const last = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

    let pageText: string | undefined;
    let pageNote: string | undefined;
    const url = findUrl(last);
    if (url) {
      try {
        pageText = await fetchPageText(url);
      } catch (err) {
        pageNote = `I couldn't open that link (${(err as Error).message}), so I used your message only.`;
      }
    }

    const ai = await chatJSON<{ brief?: Partial<Constraints>; reply?: string }>(
      briefSystem(mode === "validate" ? "validate" : "find"),
      briefUser(messages, { ...EMPTY_CONSTRAINTS, ...brief }, pageText),
      1500
    );

    const merged: Constraints = { ...EMPTY_CONSTRAINTS, ...brief };
    for (const key of Object.keys(EMPTY_CONSTRAINTS) as (keyof Constraints)[]) {
      const v = ai.brief?.[key];
      if (typeof v === "string" && v.trim()) merged[key] = v.trim();
    }
    // The page title is a safe fallback for the hackathon's name.
    if (pageText && !merged.name.trim()) {
      const title = pageText.split("\n")[0].split(/\s[|·–—-]\s/)[0].trim();
      if (title && title.length <= 80) merged.name = title;
    }
    const reply = [pageNote, ai.reply].filter(Boolean).join(" ") || "Got it. Start the scan whenever you're ready.";
    return NextResponse.json({ brief: merged, reply, usedLink: Boolean(pageText) });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

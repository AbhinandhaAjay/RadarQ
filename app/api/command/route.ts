import { NextResponse } from "next/server";
import { chatJSON } from "@/lib/groq";
import { COMMAND_SYSTEM, commandUser, type CommandRow } from "@/lib/prompts";
import type { CommandAction, SourceId } from "@/lib/types";

export const maxDuration = 30;

const SOURCES: SourceId[] = ["reddit", "hackernews", "bluesky", "stackexchange"];
const SORTS = ["opportunity", "fit", "pain", "mentions"] as const;

/** Keep only whitelisted actions whose ids exist, with every field clamped. */
function sanitize(raw: unknown[], ids: Set<string>): CommandAction[] {
  const out: CommandAction[] = [];
  for (const r of raw) {
    const a = r as Record<string, unknown>;
    switch (a?.type) {
      case "filter": {
        const f: Extract<CommandAction, { type: "filter" }> = { type: "filter" };
        if (typeof a.minPain === "number") f.minPain = Math.min(5, Math.max(1, Math.round(a.minPain)));
        if (typeof a.openGapOnly === "boolean") f.openGapOnly = a.openGapOnly;
        if (typeof a.maxTools === "number") f.maxTools = Math.min(3, Math.max(0, Math.round(a.maxTools)));
        if (Array.isArray(a.sources)) f.sources = a.sources.filter((s): s is SourceId => SOURCES.includes(s as SourceId));
        if (typeof a.text === "string") f.text = a.text.slice(0, 60);
        out.push(f);
        break;
      }
      case "clearFilters":
      case "evidence":
      case "pitch":
        out.push({ type: a.type });
        break;
      case "sort":
        if (SORTS.includes(a.by as (typeof SORTS)[number])) out.push({ type: "sort", by: a.by as (typeof SORTS)[number] });
        break;
      case "select": {
        const mode = a.mode === "add" || a.mode === "clear" ? a.mode : "replace";
        const valid = Array.isArray(a.ids) ? a.ids.map(String).filter((id) => ids.has(id)) : [];
        if (mode === "clear" || valid.length) out.push({ type: "select", ids: valid, mode });
        break;
      }
      case "open":
      case "devil":
        if (ids.has(String(a.id))) out.push({ type: a.type, id: String(a.id) });
        break;
      case "view":
        if (a.view === "board" || a.view === "map") out.push({ type: "view", view: a.view });
        break;
      case "compare": {
        const pair = Array.isArray(a.ids) ? a.ids.map(String).filter((id) => ids.has(id)) : [];
        if (pair.length >= 2 && pair[0] !== pair[1]) out.push({ type: "compare", ids: [pair[0], pair[1]] });
        break;
      }
    }
  }
  return out.slice(0, 6);
}

export async function POST(req: Request) {
  try {
    const { command, rows, filters } = (await req.json()) as { command: string; rows: CommandRow[]; filters: string };
    if (!command?.trim()) return NextResponse.json({ error: "Say or type a command." }, { status: 400 });
    if (!rows?.length) return NextResponse.json({ error: "There are no issues on the board yet." }, { status: 400 });
    const ai = await chatJSON<{ reply?: string; actions?: unknown[] }>(
      COMMAND_SYSTEM,
      commandUser(command.slice(0, 500), rows.slice(0, 12), filters),
      1500
    );
    const actions = sanitize(Array.isArray(ai.actions) ? ai.actions : [], new Set(rows.map((r) => r.id)));
    return NextResponse.json({ reply: ai.reply ?? "", actions });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// Offline fallbacks, used when the AI is unavailable, so every flow still ends in a result.

import type { CommandRow } from "./prompts";
import type { CommandAction, Constraints, Issue, Statement } from "./types";
import { SOURCE_LABELS } from "./types";

/** A plain pitch sheet built straight from an issue's evidence, without the AI. */
export function draftStatements(c: Constraints, issues: Issue[]): Statement[] {
  return issues.map((i) => {
    const who = i.affected || "the people quoted below";
    const gaps = i.existingTools.filter((t) => t.gap);
    return {
      name: "",
      pitch: i.summary,
      title: i.title,
      problem: i.summary,
      whoFaces: who,
      evidence: i.quotes.slice(0, 4).map((q) => `“${q.text}” (${SOURCE_LABELS[q.source]}${q.community ? `, ${q.community}` : ""})`),
      proposedSolution: gaps.length
        ? `A focused tool for ${who} that closes the gap the existing options leave: ${gaps.map((t) => `${t.name} (${t.gap})`).join("; ")}.`
        : `A focused tool for ${who} that removes this pain end to end. Nobody in the posts names a tool that already does it.`,
      mvpFeatures: [
        `The one core flow: ${i.title.toLowerCase()}, solved for a single user`,
        "A simple dashboard showing what changed after using it",
        "Seed data from the quoted posts so the demo feels real",
      ],
      buildPlan: [
        { phase: "First third", tasks: ["Interview one person from the quotes' communities", "Build the core flow with fake data"] },
        { phase: "Middle", tasks: ["Connect real data", `Use ${c.techStack || "the stack you know best"}`] },
        { phase: "Last third", tasks: ["Polish the demo path", "Rehearse the pitch with the quotes as proof"] },
      ],
      demoIdea: i.quotes[0] ? `Read out “${i.quotes[0].text.slice(0, 120)}”, then show the fix in under a minute.` : "Show the pain, then the fix, in under a minute.",
      whyItFits: i.fitReason || i.painReason || `Pain ${i.painScore}/5 across ${i.mentions} posts.`,
    };
  });
}

const NUMBERS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, ek: 1, do: 2, teen: 3 };
const num = (s?: string) => (s ? Number(s) || NUMBERS[s.toLowerCase()] || 0 : 0);

/**
 * Understands the most common board commands without the AI.
 * Returns null when the command isn't one of them.
 */
export function localCommand(command: string, rows: CommandRow[]): { reply: string; actions: CommandAction[] } | null {
  const q = command.toLowerCase();
  const byRank = (r: number) => rows.find((x) => x.rank === r)?.id;
  const rankMatch = q.match(/#\s*(\d+)|number\s+(\w+)|issue\s+(\w+)/);
  const ranked = rankMatch ? num(rankMatch[1] ?? rankMatch[2] ?? rankMatch[3]) : 0;
  const top = (n: number) => rows.slice(0, n).map((r) => r.id);

  if (/clear|reset|show (me )?(all|everything)/.test(q)) return { reply: "Cleared every filter.", actions: [{ type: "clearFilters" }] };
  if (/open gap|no (competition|tools?)|low.?competition|untouched/.test(q))
    return { reply: "Showing only problems with no known tools.", actions: [{ type: "filter", openGapOnly: true }] };
  if (/compare/.test(q) && rows.length >= 2) {
    const ids = top(2) as [string, string];
    return { reply: `Comparing #1 and #2.`, actions: [{ type: "compare", ids }] };
  }
  if (/argue|against|devil|kill/.test(q) && rows.length) {
    const id = byRank(ranked || 1)!;
    return { reply: `Building the case against #${ranked || 1}.`, actions: [{ type: "devil", id }] };
  }
  const short = q.match(/shortlist (the )?(top|first) (\w+)/);
  if (short) {
    const n = Math.max(1, num(short[3]) || 3);
    const actions: CommandAction[] = [{ type: "select", ids: top(n), mode: "replace" }];
    if (/pitch|write/.test(q)) actions.push({ type: "pitch" });
    return { reply: `Shortlisted the top ${Math.min(n, rows.length)}.`, actions };
  }
  const sort = q.match(/(sort|rank|order).*(pain|fit|mention|opportunit)/);
  if (sort) {
    const by = sort[2].startsWith("mention") ? "mentions" : sort[2].startsWith("opportunit") ? "opportunity" : (sort[2] as "pain" | "fit");
    return { reply: `Sorted by ${by}.`, actions: [{ type: "sort", by }] };
  }
  const pain = num(q.match(/pain\s*(\w+)/)?.[1]);
  if (pain >= 1 && pain <= 5) return { reply: `Showing pain ${pain} and up.`, actions: [{ type: "filter", minPain: pain }] };
  if (/\bmap\b/.test(q)) return { reply: "Opened the opportunity map.", actions: [{ type: "view", view: "map" }] };
  if (/evidence|posts|sources/.test(q)) return { reply: "Opened the evidence explorer.", actions: [{ type: "evidence" }] };
  if (/why|open|show|explain/.test(q) && rows.length) {
    const r = rows.find((x) => x.rank === (ranked || 1))!;
    return {
      reply: `#${r.rank} “${r.title}” scores ${r.opportunity}: pain ${r.pain}/5, ${r.mentions} mentions, ${r.tools} known tools, ${r.evidence.toLowerCase()} evidence.`,
      actions: [{ type: "open", id: r.id }],
    };
  }
  return null;
}

/** Turns raw server errors (rate limits, a missing key) into something a judge can act on. */
export function friendlyError(err: unknown): string {
  const msg = (err as Error)?.message ?? String(err);
  if (/All AI models failed|GROQ_API_KEY|HTTP 429|rate limit/i.test(msg)) {
    return "The AI is busy right now (too many requests). Your brief is kept; try again in a minute, or watch a saved run.";
  }
  if (/Couldn't reach RadarQ/.test(msg)) return msg;
  return `${msg} You can try again, or watch a saved run.`;
}

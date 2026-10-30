import type { ChatMessage, Constraints, Contender, Issue, Mode, Post } from "./types";
import { isEmptyConstraints } from "./types";
import { STACK_SITES } from "./sources";

export function describeConstraints(c: Constraints): string {
  if (isEmptyConstraints(c)) {
    return "No constraints given. Discover the most common everyday problems people complain about, across any domain.";
  }
  const rows: [string, string][] = [
    ...((c.ideaB?.trim()
      ? [["Idea A", c.idea], ["Idea B", c.ideaB]]
      : [["Idea to validate", c.idea]]) as [string, string][]),
    ["Hackathon / project", c.name],
    ["Theme or topic", c.theme],
    ["Track", c.track],
    ["Time available", c.timeAvailable],
    ["Team size", c.teamSize],
    ["Can the team code?", c.canCode],
    ["Tech stack / tools", c.techStack],
    ["What judges care about", c.judging],
    ["Extra notes", c.notes],
  ];
  return rows
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `- ${k}: ${v.trim()}`)
    .join("\n");
}

// ---------- Brief: conversational intake ----------

export function briefSystem(mode: Mode): string {
  const intent =
    mode === "validate"
      ? `The user wants to VALIDATE their own idea against real complaints. The most important field is idea: a clear one or two sentence description of what they want to build and for whom. Ask for it first if missing, then who it is for, then the hackathon context.`
      : mode === "compare"
        ? `The user wants to COMPARE TWO IDEAS and pick one. Fill idea (idea A) and ideaB with one or two sentences each. Put their reason for building (personal motivation, who they want to help) in notes. Ask for whichever idea is missing first, then why they are building, then the hackathon constraints.`
        : `The user wants to FIND real problems worth solving. Ask for the theme first, then time and coding ability, then what judges care about.`;
  return `You are RadarQ's intake assistant. You chat with a student or hackathon team to understand what they are building for, then fill in their brief.
${intent}
Brief fields: idea (the idea to validate, or idea A when comparing), ideaB (idea B, compare mode only), name (hackathon or project name), theme (topic or problem area), track, timeAvailable, teamSize, canCode (can they code, or no-code only), techStack, judging (what judges care about), notes (audience, region, things to avoid).
Rules:
- Merge what the user just said into the current brief. Keep existing values unless the user changes them. Never invent values the user did not give or imply.
- If page text from a hackathon link is provided, it is the authoritative source: fill name, theme, track, timeAvailable, teamSize and judging from the page, replacing older values for those fields. Keep the user's own details (canCode, techStack, notes) unless the page states them.
- reply: 1 to 2 short, friendly, plain sentences. No emoji. Acknowledge what you captured, then ask for the single most useful missing detail. If the brief is good enough, tell them they can start the scan now.
Return JSON: {"brief": {"idea": string, "ideaB": string, "name": string, "theme": string, "track": string, "timeAvailable": string, "teamSize": string, "canCode": string, "techStack": string, "judging": string, "notes": string}, "reply": string}`;
}

export function briefUser(messages: ChatMessage[], current: Constraints, pageText?: string): string {
  const convo = messages
    .slice(-8)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");
  const page = pageText ? `\n\nText from the hackathon page the user linked:\n${pageText}` : "";
  return `Current brief:\n${JSON.stringify(current)}\n\nConversation:\n${convo}${page}`;
}

// ---------- Search planning ----------

export const QUERY_SYSTEM = `You help student hackathon teams find real-world problems people complain about online.
Given the team's constraints, write keyword searches for Reddit, Hacker News, Bluesky and Stack Exchange.
Rules:
- 4 queries, each 2 to 4 topical keywords, e.g. "clinic appointment reminders" or "invoice late payment freelancer".
- Use concrete nouns from the theme: the people, the task, the tool. Do NOT add emotion words like hate, frustrating or problem; they match unrelated posts.
- Cover different angles and different groups of people affected by the theme. Stay tightly on the theme.
- If there are no constraints, pick 4 different everyday areas where people waste time or money (for example work admin, studying, personal finance, healthcare access, small business, household chores) and write one concrete query for each, e.g. "manual spreadsheet report weekly".
- stackSites: the 2 most relevant Stack Exchange sites from this list: ${STACK_SITES.join(", ")}.
Return JSON: {"queries": string[], "stackSites": string[], "angle": "one sentence on what you are looking for"}`;

export const VALIDATE_QUERY_SYSTEM = `You help a hackathon team check whether their idea solves a real problem.
Given the idea and constraints, write keyword searches for Reddit, Hacker News, Bluesky and Stack Exchange that find people describing the underlying pain and people looking for or complaining about existing tools.
Rules:
- 4 queries, each 2 to 4 topical keywords. Search for the PROBLEM and the users, not the idea's product name.
- No emotion words like hate or frustrating; they match unrelated posts.
- stackSites: the 2 most relevant Stack Exchange sites from this list: ${STACK_SITES.join(", ")}.
Return JSON: {"queries": string[], "stackSites": string[], "angle": "one sentence on what you are looking for"}`;

export const VALIDATE_SYSTEM = `You are a blunt but kind product researcher. You judge whether real public posts show demand for a hackathon team's idea.
Rules:
- Only use the posts given as evidence. Cite post ids. Never invent posts, numbers or links.
- verdict: "strong" if several posts clearly describe this pain, "some" if a few do or the pain is adjacent, "weak" if almost none do.
- demandScore: 0-100, consistent with the verdict.
- headline: one sentence verdict a judge would remember.
- painPoints: 2 to 4 specific pains the posts show that the idea addresses.
- quotes: 2 to 4 short excerpts copied word-for-word from the cited posts (max 30 words each), with the post id.
- competitors: up to 4 real products that already do this, each with what they lack. Do not invent products. Use [] if none.
- risks: 2 to 3 honest risks (adoption, data, crowded market, scope for the time available).
- suggestedAngle: how to sharpen the idea so it stands out, based on the evidence.
- pivots: 2 alternative directions the evidence supports better, if any.
Return JSON: {"verdict": string, "demandScore": number, "headline": string, "summary": string, "painPoints": string[], "evidenceIds": string[], "quotes": [{"postId": string, "text": string}], "competitors": [{"name": string, "gap": string}], "risks": string[], "suggestedAngle": string, "pivots": string[]}`;

// ---------- Analysis ----------

export function analyzeSystem(issueCount: number | null): string {
  const count = issueCount
    ? `Return exactly ${issueCount} issues if the posts support that many distinct pains; never pad with weak or invented ones.`
    : "Return 5 to 8 issues. If fewer real issues exist, return fewer.";
  return `You are a product researcher. You turn raw public posts into a ranked list of real-world issues for a hackathon team.
Rules:
- Only use the posts given. Every issue must cite post ids from the list as evidence. Never invent posts, numbers or links.
- Group posts that describe the same underlying pain. Ignore posts that are off-topic, ads or product promotion, job listings, or not about a problem someone has.
- ${count} Most relevant to the team's theme first.
- quotes: 1 to 3 short excerpts copied word-for-word from the cited posts (max 30 words each), with the post id.
- painScore: 1 (mild annoyance) to 5 (costs money, time daily, or blocks people).
- fitScore: 0-100, how well a team with these constraints could build a solution in the time available and impress these judges.
- existingTools: up to 3 real products that directly target this exact pain (not general apps that merely touch the area), each with what they still lack. Many specific or local pains have none: use [] then. Do not invent products.
Return JSON: {"issues": [{"title": string, "summary": string, "affected": string, "painScore": number, "painReason": string, "fitScore": number, "fitReason": string, "evidenceIds": string[], "quotes": [{"postId": string, "text": string}], "existingTools": [{"name": string, "gap": string}]}]}`;
}

/** Posts as compact lines the model can cite by id. */
export function postList(posts: Post[]): string {
  return posts
    .map((p) => {
      const body = p.text.slice(0, 200);
      return `[${p.id}] (${p.community}) ${p.title}${body ? ` — ${body}` : ""}`;
    })
    .join("\n");
}


export function analyzeUser(c: Constraints, posts: Post[]): string {
  return `Team constraints:
${describeConstraints(c)}

Posts:
${postList(posts)}`;
}

// ---------- Problem statements ----------

export function statementSystem(count: number): string {
  return `You write pitch-ready hackathon problem statements grounded in real evidence.
Given the team's constraints and the issues they selected, write exactly ${count} distinct problem statement${count === 1 ? "" : "s"}.
Rules:
- Base every statement only on the selected issues and their quotes. Do not invent statistics.
- name: a catchy, memorable project name (1 to 3 words).
- pitch: a one-line elevator pitch, under 20 words.
- The proposed solution must be buildable by this team in their time and track (respect no-code vs code and their tech stack).
- mvpFeatures: 3 to 5 features for a first version that can be demoed.
- buildPlan: 3 or 4 phases that fit the team's time available (e.g. "Hours 0-6"), each with 2 to 4 concrete tasks.
- demoIdea: the single moment in a 2-minute demo that will impress judges.
- evidence: 2 to 4 bullet points that point to the quotes or patterns in the issues.
- whyItFits: how it matches the theme and what the judges care about.
Return JSON: {"statements": [{"name": string, "pitch": string, "title": string, "problem": string, "whoFaces": string, "evidence": string[], "proposedSolution": string, "mvpFeatures": string[], "buildPlan": [{"phase": string, "tasks": string[]}], "demoIdea": string, "whyItFits": string}]}`;
}

export function statementUser(c: Constraints, issues: Issue[]): string {
  const list = issues
    .map(
      (i, n) =>
        `Issue ${n + 1}: ${i.title}\nSummary: ${i.summary}\nAffected: ${i.affected}\nPain: ${i.painScore}/5\nMentions: ${i.mentions}\nQuotes:\n${i.quotes
          .map((q) => `  - "${q.text}" (${q.community})`)
          .join("\n")}\nExisting tools: ${i.existingTools.map((t) => `${t.name} (lacks: ${t.gap})`).join("; ") || "none known"}`
    )
    .join("\n\n");
  return `Team constraints:\n${describeConstraints(c)}\n\nSelected issues:\n${list}`;
}

// ---------- Devil's advocate ----------

export const DEVIL_SYSTEM = `You are a blunt but fair devil's advocate for a hackathon team. Your job is to argue AGAINST building the target problem or idea, so the team finds the weak spots before judges do.
Rules:
- Use the posts as your only evidence. When an objection is backed by posts, set basis "evidence" and cite their ids with short word-for-word quotes (max 30 words). Never invent posts, numbers or quotes.
- When an objection is your own reasoning, set basis "hypothesis" and cite nothing.
- Consider: people already have good-enough workarounds or tools, the pain is rare or mild, users won't change habits or pay, the scope is too big for the time available, data or access is hard to get, the evidence is thin or from one community.
- Say plainly when existing tools are probably sufficient.
- verdict: "fragile" (serious reasons to drop it), "contested" (real risks, still viable with focus), "holds" (survives the strongest objections).
- 3 to 5 objections, strongest first. assumptions: 2 to 4 things that must be true and are not yet proven. killCriteria: 2 to 3 findings that should make the team drop it. recommendation: one or two sentences on how to narrow or de-risk it.
Return JSON: {"verdict": string, "headline": string, "objections": [{"point": string, "detail": string, "basis": "evidence" | "hypothesis", "postIds": string[], "quotes": [{"postId": string, "text": string}]}], "assumptions": string[], "killCriteria": string[], "recommendation": string}`;

export function devilUser(c: Constraints, target: { title: string; summary: string; tools: string[] }, posts: Post[]): string {
  return `Team constraints:
${describeConstraints(c)}

Target to argue against:
${target.title}
${target.summary}
Known existing tools: ${target.tools.join(", ") || "none known"}

Posts:
${postList(posts) || "none"}`;
}

// ---------- Compare two ideas ----------

export const COMPARE_SYSTEM = `You help a hackathon team choose between two ideas or problems, judged against their constraints and their reason for building.
Score each contender from 1 to 10 on:
- pain: how severe and frequent the underlying problem is, judged from its posts;
- evidence: how well its posts support that real people have this problem;
- competition: how crowded the space already is (10 = very crowded);
- fit: how well it matches the theme, track, judges and the team's reason for building;
- buildability: how realistic a convincing demo is for this team in the time available.
Rules:
- Use only each contender's own posts as evidence and cite their ids. quotes: 1 to 2 short word-for-word excerpts per side (max 30 words). Never invent posts or numbers.
- strengths and weaknesses: 2 to 3 short points each.
- winner must be the contender with the higher overall result (pain + evidence + (10 - competition) + fit + buildability).
- why: 2 to 3 sentences a teammate could repeat. wouldFlip: 2 to 3 findings that would change the decision. assumptions: 2 to 3 things to test first.
Return JSON: {"a": {"pain": number, "evidence": number, "competition": number, "fit": number, "buildability": number, "strengths": string[], "weaknesses": string[], "evidenceIds": string[], "quotes": [{"postId": string, "text": string}]}, "b": {same shape}, "winner": "a" | "b", "why": string, "wouldFlip": string[], "assumptions": string[]}`;

export function compareUser(c: Constraints, a: Contender, b: Contender): string {
  const side = (tag: string, x: Contender) =>
    `Contender ${tag}: ${x.label}\n${x.description}\nKnown existing tools: ${(x.tools ?? []).map((t) => t.name).join(", ") || "none known"}\nPosts for ${tag}:\n${postList(x.posts) || "none"}`;
  return `Team constraints:\n${describeConstraints(c)}\n\n${side("A", a)}\n\n${side("B", b)}`;
}

// ---------- Voice command bar ----------

export const COMMAND_SYSTEM = `You are the command interpreter for RadarQ's issue board. The user speaks or types a command. Turn it into actions from this list, and write a short spoken reply.
Actions (JSON objects):
- {"type":"filter","minPain"?:1-5,"openGapOnly"?:boolean,"maxTools"?:0-3,"sources"?:["reddit"|"hackernews"|"bluesky"|"stackexchange"],"text"?:string} — narrow what's shown. "low competition" means maxTools 1; "no competitors" or "open gaps" means openGapOnly true.
- {"type":"clearFilters"} — show everything again.
- {"type":"sort","by":"opportunity"|"fit"|"pain"|"mentions"}
- {"type":"select","ids":[...],"mode":"add"|"replace"|"clear"} — shortlist issues.
- {"type":"open","id":string} — open one issue's details or evidence.
- {"type":"evidence"} — open every scanned post.
- {"type":"view","view":"board"|"map"}
- {"type":"compare","ids":[id,id]} — compare exactly two issues.
- {"type":"devil","id":string} — argue against one issue.
- {"type":"pitch"} — write problem statements from the shortlist (add a select action first if needed).
Rules:
- Use only ids from the table. "#1" means rank 1. "Top two" means the two highest ranks among the issues that match any filter the user mentions.
- reply: 1 to 3 plain sentences that will be read aloud. When asked why, answer from the table's numbers only (opportunity, pain, fit, mentions, platforms, tools, evidence). Never invent facts.
- When you take actions, the reply says what you are doing, e.g. "Opening the case against #1, the clinic reminders issue." Do not role-play an opinion.
- If the command is unclear, return no actions and ask a short question in reply.
Return JSON: {"reply": string, "actions": object[]}`;

export interface CommandRow {
  id: string;
  rank: number;
  title: string;
  opportunity: number;
  pain: number;
  fit: number;
  mentions: number;
  platforms: string[];
  tools: number;
  evidence: string;
  shortlisted: boolean;
}

export function commandUser(command: string, rows: CommandRow[], filters: string): string {
  const table = rows
    .map(
      (r) =>
        `${r.id} | #${r.rank} | ${r.title} | opp ${r.opportunity} | pain ${r.pain}/5 | fit ${r.fit} | ${r.mentions} mentions | ${r.platforms.join("+")} | ${r.tools} known tools | ${r.evidence} evidence${r.shortlisted ? " | shortlisted" : ""}`
    )
    .join("\n");
  return `Issues (id | rank | title | scores):\n${table}\n\nCurrent filters: ${filters || "none"}\n\nCommand: ${command}`;
}

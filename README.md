# RadarQ

**Stop guessing. Start listening.**

RadarQ finds the problems real people keep complaining about on Reddit, Hacker News, Bluesky and Stack Exchange, and turns them into pitch-ready problem statements for your hackathon. You talk; it listens to the internet. Every quote links back to the post it came from.

| | What happens | Who does it |
|---|---|---|
| **1. Ramble** | You hold your Wispr key and talk for a minute: what you're into, what you can build with, what annoys you, your hackathon's time, team and judges. Ums, restarts and Hinglish are fine. | you, by voice |
| **2. Brief** | The messy dictation becomes a clean brief, and RadarQ shows which phrase became which field: *“it's a thirty six hour one” → Time: 36 hours*. | RadarQ |
| **3. Scan** | It plans searches from the brief and pulls public posts from four platforms. | RadarQ |
| **4. Board** | The problems people keep raising are pinned on a sticky-note board, ranked by opportunity, each with its quotes, evidence strength and the tools that already exist. | RadarQ |
| **5. Decide** | You steer the board out loud: “show only open gaps”, “compare the top two”, “argue against the top issue”. Dictated commands run on their own. | you, by voice |
| **6. Pitch** | Your shortlist becomes pitch sheets: problem, who faces it, evidence, solution, MVP, build plan and the demo moment. | RadarQ |

**Where Wispr Flow fits.** Wispr Flow is how you talk to RadarQ. A minute of rambling becomes the brief, and spoken commands drive the board. There is no browser microphone: Wispr is the only voice path. RadarQ can tell a dictation from typing, so dictated briefs and pitch sheets say so. Without Wispr everything still works by typing.

> ### See it in two minutes
>
> **Live app:** [radar-q.vercel.app](https://radar-q.vercel.app/)
>
> 1. **No setup:** open RadarQ and press **▶ Play the demo**. It replays a real run: a ramble becomes the brief, real posts stream in, the board appears, the top issues are shortlisted and the pitch is written.
> 2. **With Wispr Flow:** press **Ramble**, click the box, hold your Wispr key (Ctrl + Win on Windows, Fn on Mac) and talk for 30 to 60 seconds. Then **Turn it into a brief** and **Start the scan**.
> 3. **No hands:** on the board, hold your Wispr key and say “compare the top two”. It runs after a short pause, and the reply is read aloud.
> 4. **The proof:** look for the **Wispr Flow detected** badge on your messages, the brief card and every pitch sheet, and the session counter in the top bar (“Dictated this session · 1,204 chars in 4 bursts”).

---

## What it does

**Find problems.** Describe your hackathon by rambling, chatting or pasting its link (RadarQ reads the page and fills the brief), or leave it empty for today's most common complaints. Pick how many issues you want (3 to 12). Switch between the sticky-note board and an opportunity map of pain against fit, filter by pain, platform or open gaps, and sort by opportunity, fit, pain or mentions.

**Validate my idea.** Describe your idea and get a demand verdict (strong, some or weak) with a demand score, the pain points real posts describe, the competitors already out there, the risks, a suggested angle and possible pivots.

**Compare two ideas.** Describe two ideas and why you're building. RadarQ scans each one, scores both on pain, evidence, competition, fit and buildability, picks a winner, and says what would flip the result. You can also compare any two issues on the board.

**Kill my idea.** A devil's advocate argues against any issue, your validated idea or the comparison winner: its objections (marked as evidence or hypothesis), the assumptions you're making, and what would make you drop it.

**Evidence strength.** Every issue gets a score and a timeline from how many communities, platforms and recent posts mention it. The evidence explorer shows every post that was read.

**Pitch sheets.** Shortlist issues and RadarQ writes 1 to 6 pitch sheets. Copy one or all, download Markdown, save as PDF, or share a link that opens the same results for anyone, no account needed.

## Using RadarQ with Wispr Flow

Wispr Flow types what you say into whichever box has focus. RadarQ is built around that:

| Where | What you say | What happens |
|---|---|---|
| **Ramble** (brief) | “Okay so, I'm a second-year CS student, I mostly do React… my mom runs a clinic and patients keep missing appointments… it's a 36-hour hackathon, team of three, judges want social impact.” | One dictation becomes the whole brief. A “you said → it became” map shows where every field came from. |
| **Chat** (brief) | “Add that we're in India and WhatsApp is how everyone talks.” | The brief is updated and the changed fields flash. |
| **Command bar** (board) | “show only open gaps”, “only pain four and up”, “sort by mentions”, “clear the filters” | The board filters and sorts itself. |
| **Command bar** | “why is number one ranked first?”, “sabse strong problem kaun sa hai?” | A spoken answer, read aloud, in English or Hinglish. |
| **Command bar** | “compare the top two”, “argue against the top issue”, “shortlist the top 3 and write the pitch” | The comparison, the case against, or the pitch opens. |
| **No hands** (command bar) | anything | A dictated command runs on its own after a short pause. Typed commands never do; one keystroke after a dictation cancels it. |

**How the dictation check works, and its limit.** Wispr Flow inserts a whole dictation at once; typing arrives one key at a time. RadarQ counts both in every box and shows it as “Wispr Flow detected · 212 chars in 1 burst · 0 keystrokes” on messages, the brief card, pitch sheets, the Markdown export and share links. Pasted text also arrives at once, so the badge proves “not typed key by key”, not “spoken”. The demo's ramble is replayed, not dictated, so it is labelled **Simulated Wispr** and never counts toward the session counter.

## When the AI is busy

RadarQ runs on free-tier AI models, which can hit rate limits. Every step has a fallback, so a judge never hits a dead end:

| If this fails | You get |
|---|---|
| The scan | A plain-English message with **▶ Show a saved run instead** and **Try again** |
| The brief chat or a ramble | What you said is kept in the brief's notes, so the scan can still run |
| Writing the pitch | Pitch sheets drafted straight from the quotes, labelled “drafted offline” |
| A board command | A built-in parser still understands filters, sorting, compare, shortlist, “argue against” and “why is #1 first” |
| One platform | The scan continues with the others and says which one was unavailable |

## Run it locally

```bash
git clone https://github.com/AbhinandhaAjay/RadarQ && cd RadarQ
npm install
echo "GROQ_API_KEY=your_key" > .env.local
npm run dev
```

Open http://localhost:3000. A free Groq key works; if one model is rate-limited, RadarQ falls through to the next.

Stack: Next.js 15, React 19, TypeScript, Groq (gpt-oss), Three.js, dnd-kit. Posts come from the public Reddit, Hacker News (Algolia), Bluesky and Stack Exchange APIs; nothing is stored on a server.

---

Built by Abhinandha K for [No Hands: The Wispr Challenge](https://www.wemakedevs.org/wispr) (WeMakeDevs × Wispr Flow), No-Code track. This is an independent project, not a Wispr product.

**Built hands-free, too.** I found the challenge on 30 October and built RadarQ in two days by dictating to Claude Code with Wispr Flow.

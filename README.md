# RadarQ

**Stop guessing. Start listening.** RadarQ finds real problems people complain about on Reddit, Hacker News, Bluesky and Stack Exchange, and turns them into pitch-ready problem statements for hackathons. Every quote links back to the post it came from.

Built entirely by voice with Wispr Flow for the WeMakeDevs **No Hands: The Wispr Challenge** (No-Code track).

## What it does
- **Find problems:** describe your hackathon by chatting, speaking, or pasting its link (or leave it empty for today's top issues). RadarQ scans public posts and pins issues on a sticky-note board, ranked by opportunity.
- **Validate an idea:** see a demand verdict backed by real quotes, then use "Kill my idea" for a Devil's Advocate take.
- **Compare two ideas:** score them on pain, evidence, competition, fit and buildability, then pick a winner.
- **Evidence strength:** a score and a timeline for each issue, based on how many communities, platforms and recent posts mention it.
- **Voice command bar:** for example "show only open gaps", "why is #1 first?" or "argue against the top issue".
- **Pitch sheets:** problem, evidence, MVP, build plan and demo idea, with copy-all, PDF export and share links.

## Run locally
```bash
npm install
echo "GROQ_API_KEY=your_key" > .env.local
npm run dev
```

Stack: Next.js 15, React 19, TypeScript, Groq (gpt-oss), Three.js, dnd-kit.

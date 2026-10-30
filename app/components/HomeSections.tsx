"use client";

import { useState } from "react";
import type { SourceId } from "@/lib/types";

const SOURCES: { id: SourceId; name: string; what: string }[] = [
  { id: "reddit", name: "Reddit", what: "posts & comments" },
  { id: "hackernews", name: "Hacker News", what: "stories & comments" },
  { id: "bluesky", name: "Bluesky", what: "public posts" },
  { id: "stackexchange", name: "Stack Exchange", what: "17 Q&A sites" },
];

/** Looping strip of the communities we listen to, like a client-logo marquee. */
export function SourceMarquee() {
  const row = [...SOURCES, ...SOURCES, ...SOURCES];
  return (
    <section className="marquee" aria-label="Sources RadarQ listens to">
      <span className="eyebrow">Listening to</span>
      <div className="marquee-track">
        <div className="marquee-row">
          {[...row, ...row].map((s, i) => (
            <span key={i} className="marquee-item" aria-hidden={i >= row.length}>
              <span className={`sdot ${s.id}`} /> {s.name} <small>{s.what}</small>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// Real complaints the scanner surfaced while testing, with their original posts.
const OVERHEARD = [
  {
    source: "bluesky" as SourceId,
    where: "Bluesky",
    text: "My mental health clinic sends me about fifty reminders per appointment",
    url: "https://bsky.app/profile/compostwitch.bsky.social/post/3m5jqkj7dtk2t",
    tag: "Healthcare",
  },
  {
    source: "reddit" as SourceId,
    where: "r/SmallBusinessCanada",
    text: "Late cancels and no shows are costing us six to eight appointments a week right now",
    url: "https://www.reddit.com/r/SmallBusinessCanada/comments/1wjf0ol/bc_two_room_massage_clinic_late_cancels_are/",
    tag: "Small business",
  },
  {
    source: "reddit" as SourceId,
    where: "r/AskAnAustralian",
    text: "clinic keeps making ghost appointments for me even after I ask them to remove my name",
    url: "https://www.reddit.com/r/AskAnAustralian/comments/1tkgul0/a_medical_clinic_keeps_making_ghost_appointments/",
    tag: "Patients",
  },
];

export function Overheard() {
  return (
    <section className="section">
      <div className="split-head">
        <h2 className="section-title">Problems<br /><em>people raise.</em></h2>
        <div>
          <span className="eyebrow">Overheard</span>
          <p className="lede">Three real posts from one test scan on small clinics. Every note on your board looks like this: a quote, a source, a link back.</p>
        </div>
      </div>
      <div className="overheard">
        {OVERHEARD.map((q, i) => (
          <a key={q.url} className={`scrap s${i + 1}`} href={q.url} target="_blank" rel="noopener noreferrer">
            <span className="scrap-tag">{q.tag}</span>
            <blockquote>“{q.text}”</blockquote>
            <span className="scrap-foot"><span className={`sdot ${q.source}`} /> {q.where} <span className="arrow">↗</span></span>
          </a>
        ))}
      </div>
    </section>
  );
}

const PRACTICES = [
  { title: "Brief", text: "Talk, type, or paste the hackathon link.", detail: "Say “36-hour health hackathon, three of us, we know React, judges want impact.” The index card fills itself in while you talk. Every field is optional, so an empty brief finds today's most common complaints." },
  { title: "Scan", text: "Real posts from four communities.", detail: "The assistant writes focused searches from your brief, then pulls public posts from Reddit, Hacker News, Bluesky and Stack Exchange. You watch each one land on the globe." },
  { title: "Board", text: "Issues pinned up as sticky notes.", detail: "Each note gets an opportunity score from pain, fit, how often it comes up and how crowded it is. Drag the ones you like into your shortlist, or flip to the opportunity map." },
  { title: "Pitch", text: "A statement you can submit.", detail: "Get a project name, a one-line pitch, evidence, an MVP and a build plan sized to your time. Share the whole board with your team in one link." },
];

/** Numbered rows that open one at a time, in the style of a studio's practice list. */
export function Practices() {
  const [open, setOpen] = useState(0);
  return (
    <section className="section" id="how">
      <div className="split-head">
        <h2 className="section-title">What it<br /><em>actually does.</em></h2>
        <div>
          <span className="eyebrow">Four stops</span>
          <p className="lede">From “what do we even build?” to a pitch backed by real people, in about a minute.</p>
        </div>
      </div>
      <ol className="practices">
        {PRACTICES.map((p, i) => (
          <li key={p.title} className={`practice ${open === i ? "open" : ""}`}>
            <button onClick={() => setOpen(i)} onMouseEnter={() => setOpen(i)} aria-expanded={open === i}>
              <span className="p-num">({String(i + 1).padStart(3, "0")})</span>
              <span className="p-title">{p.title}</span>
              <span className="p-text">{p.text}</span>
              <span className="p-plus" aria-hidden="true">{open === i ? "−" : "+"}</span>
            </button>
            <div className="p-detail"><p>{p.detail}</p></div>
          </li>
        ))}
      </ol>
    </section>
  );
}

const FAQ = [
  { q: "Are the quotes real?", a: "Yes. Every quote is copied from a public post the scan fetched, and links to the original. If the AI paraphrases, the app swaps in the post's own words." },
  { q: "Where does the data come from?", a: "Public search on Reddit, Hacker News (via Algolia), Bluesky and 17 Stack Exchange sites. Reddit sometimes rate-limits automated searches; when it does, the app says so and uses the other three." },
  { q: "How is the opportunity score worked out?", a: "Pain and fit for your brief count most, repeated mentions add confidence, and every well-known existing tool lowers it. Scores and competitor names are AI estimates, so treat them as a starting point." },
  { q: "Do I need an account?", a: "No. It's free and there's no sign-up. Your brief is sent to the AI model only to run the scan, and RadarQ keeps no database; recent scans are remembered in your own browser." },
  { q: "Can my team see the same results?", a: "Hit Share on the board, verdict or pitch. The link carries the whole result, so teammates open exactly what you see." },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="section">
      <div className="split-head">
        <h2 className="section-title">Before<br /><em>you scan.</em></h2>
        <div>
          <span className="eyebrow">Questions</span>
          <p className="lede">What judges and teammates usually ask first.</p>
        </div>
      </div>
      <dl className="faq">
        {FAQ.map((f, i) => (
          <div key={f.q} className={`faq-item ${open === i ? "open" : ""}`}>
            <dt>
              <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                {f.q}
                <span className="p-plus" aria-hidden="true">{open === i ? "−" : "+"}</span>
              </button>
            </dt>
            <dd><p>{f.a}</p></dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function FooterCard({ onStart }: { onStart: () => void }) {
  return (
    <footer className="footer-card ember-stage">
      <div className="footer-cta">
        <h2 className="section-title">Build what<br /><em>people need.</em></h2>
        <button className="btn primary big" onClick={onStart}>Start a scan</button>
      </div>
      <div className="footer-meta">
        <span>RadarQ · built by voice with Wispr Flow for the WeMakeDevs No Hands Challenge</span>
        <span>Public data from Reddit, Hacker News, Bluesky and Stack Exchange</span>
      </div>
      <div className="footer-word" aria-hidden="true">RadarQ</div>
    </footer>
  );
}

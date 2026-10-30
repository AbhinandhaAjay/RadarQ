"use client";

import { useEffect, useState } from "react";
import Globe from "./Globe";
import { OVERHEARD } from "./HomeSections";
import { RadarMark } from "./Radar";
import type { Signal } from "./SignalGlobe";
import type { SourceId } from "@/lib/types";

const SOURCES: SourceId[] = ["reddit", "hackernews", "bluesky", "stackexchange"];
const IDLE: Signal[] = Array.from({ length: 26 }, (_, i) => ({ id: `idle-${i * 13}`, source: SOURCES[i % 4] }));

const STATS = [
  { value: "4", label: "platforms searched live" },
  { value: "17", label: "Stack Exchange sites" },
  { value: "0", label: "made-up quotes" },
  { value: "~60s", label: "from brief to pitch" },
];

export default function Hero({
  onStart,
  onValidate,
  onExample,
}: {
  onStart: () => void;
  onValidate: () => void;
  onExample: () => void;
}) {
  // Signals light up one at a time so the globe feels like it's listening.
  const [shown, setShown] = useState(6);
  useEffect(() => {
    const t = setInterval(() => setShown((n) => (n >= IDLE.length ? 6 : n + 1)), 650);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="hero ember-stage">
      <header className="hero-top">
        <span className="brand">
          <RadarMark />
          <span>RadarQ</span>
        </span>
        <nav className="hero-links" aria-label="Page sections">
          <a href="#how">How it works</a>
          <a href="#overheard">Real posts</a>
          <button onClick={onExample}>Example run</button>
        </nav>
        <span className="voice-pill">
          <span className="mic-wave" aria-hidden="true"><i /><i /><i /><i /></span>
          Built by voice with Wispr Flow
        </span>
      </header>

      <div className="hero-globe">
        <Globe signals={IDLE.slice(0, shown)} label="Globe of live signals from public communities" />
      </div>

      <div className="hero-quotes" aria-label="Real posts RadarQ found">
        {OVERHEARD.map((q, i) => (
          <a key={q.url} className={`hq hq${i + 1}`} href={q.url} target="_blank" rel="noopener noreferrer">
            <span className="hq-head">
              <span className={`sdot ${q.source}`} /> {q.where}
              <span className="hq-tag">{q.tag}</span>
            </span>
            <span className="hq-text">“{q.text}”</span>
          </a>
        ))}
        <span className="hq-note" aria-hidden="true">real posts, linked to the source ↗</span>
      </div>

      <div className="hero-bottom">
        <span className="hero-live"><span className="live" /> <span>Listening to Reddit, Hacker News, Bluesky<span className="long"> &amp; Stack Exchange</span><span className="short"> + more</span></span></span>
        <h1 className="hero-title" aria-label="Stop guessing. Start listening.">
          <span className="line l1">Stop guessing.</span>
          <span className="line l3 dim">Start listening.</span>
        </h1>
        <p className="hero-sub">
          RadarQ reads what real people complain about online and hands your hackathon team a problem worth
          building, with the quotes to prove it.
        </p>

        <div className="hero-cta">
          <button className="btn primary big" onClick={onStart}>
            Start a scan
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
          <button className="btn ghost big" onClick={onValidate}>Validate my idea</button>
        </div>
      </div>

      <dl className="hero-stats">
        {STATS.map((s) => (
          <div key={s.label}>
            <dt>{s.value}</dt>
            <dd>{s.label}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

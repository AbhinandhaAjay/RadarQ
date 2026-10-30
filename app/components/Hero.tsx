"use client";

import { useEffect, useState } from "react";
import Globe from "./Globe";
import { RadarMark } from "./Radar";
import type { Signal } from "./SignalGlobe";
import type { SourceId } from "@/lib/types";

const SOURCES: SourceId[] = ["reddit", "hackernews", "bluesky", "stackexchange"];
const IDLE: Signal[] = Array.from({ length: 26 }, (_, i) => ({ id: `idle-${i * 13}`, source: SOURCES[i % 4] }));

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
        <span className="voice-pill">
          <span className="mic-wave" aria-hidden="true"><i /><i /><i /><i /></span>
          Built by voice with Wispr Flow
        </span>
      </header>

      <div className="hero-globe">
        <Globe signals={IDLE.slice(0, shown)} label="Globe of live signals from public communities" />
      </div>

      <div className="hero-bottom">
        <h1 className="hero-title" aria-label="Stop guessing. Start listening.">
          <span className="line l1">Stop guessing.</span>
          <span className="line l3 dim">Start listening.</span>
        </h1>
        <p className="hero-sub">
          Real problems from real posts, turned into a pitch your hackathon team can build.
        </p>

        <div className="hero-cta">
          <button className="btn primary big" onClick={onStart}>
            Start a scan
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
          <button className="btn ghost big" onClick={onValidate}>Validate my idea</button>
        </div>
      </div>

    </section>
  );
}

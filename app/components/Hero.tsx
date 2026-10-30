"use client";

import { useEffect, useState } from "react";
import Globe from "./Globe";
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
      <div className="hero-globe">
        <Globe signals={IDLE.slice(0, shown)} label="Globe of live signals from public communities" />
      </div>
      <p className="globe-hint">(Drag the globe)</p>

      <div className="hero-bottom">
        <h1 className="hero-title" aria-label="Stop guessing. Start listening.">
          <span className="line l1">Stop</span>
          <span className="line l2">guessing.</span>
          <span className="line l3 dim">Start listening.</span>
        </h1>

        <aside className="status-card">
          <div className="status-top">
            <span className="eyebrow">Radar status</span>
            <span className="status-live"><span className="live" /> 4 sources live</span>
          </div>
          <p>
            RadarQ reads what people complain about on Reddit, Hacker News, Bluesky and Stack Exchange, then
            hands your team a problem worth building, with the quotes to prove it.
          </p>
          <div className="status-cta">
            <button className="btn primary" onClick={onStart}>
              Start a scan
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
            <button className="btn ghost" onClick={onValidate}>Validate my idea</button>
          </div>
          <button className="btn link small" onClick={onExample}>Watch an example run →</button>
        </aside>
      </div>
    </section>
  );
}

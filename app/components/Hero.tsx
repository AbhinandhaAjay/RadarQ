"use client";

import { useRef } from "react";
import PhoneFeed from "./PhoneFeed";
import { RadarMark } from "./Radar";

export default function Hero({
  onStart,
  onValidate,
  onExample,
}: {
  onStart: () => void;
  onValidate: () => void;
  onExample: () => void;
}) {
  // The phone leans gently toward the pointer.
  const tilt = useRef<HTMLDivElement>(null);
  function onMove(e: React.PointerEvent) {
    if (e.pointerType !== "mouse" || !tilt.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    tilt.current.style.setProperty("--ry", `${x * 16}deg`);
    tilt.current.style.setProperty("--rx", `${-y * 10}deg`);
  }

  return (
    <section className="hero ember-stage" onPointerMove={onMove}>
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

      <div className="hero-grain" aria-hidden="true" />
      <div className="hero-phone" ref={tilt}>
        <div className="hero-phone-float">
          <PhoneFeed />
        </div>
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

      <a className="scroll-cue" href="#brief" aria-label="Scroll down">
        <span className="scroll-line" />
      </a>
    </section>
  );
}

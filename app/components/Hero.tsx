"use client";

import { useRef } from "react";
import PhoneFeed from "./PhoneFeed";
import { RadarMark } from "./Radar";

const Check = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.6 2.5L16 9.5" /></svg>
);

const STEPS = ["Group posts into issues", "Score pain, fit and competition", "Argue against the top pick", "Write the pitch and build plan"];
const CHECKS = ["Real quotes, linked to the post", "Evidence strength scored", "Open gaps vs crowded spaces"];

/** Cards wired to the phone that show what RadarQ does with the posts on screen. */
function Callouts() {
  return (
    <div className="callouts" aria-hidden="true">
      <div className="co co-l co1">
        <span className="co-ico">
          <svg viewBox="0 0 24 24"><path d="M5 5h14v10H9l-4 4z" /></svg>
        </span>
        <p>I want to build a tool for this. Which problem should we pick?</p>
      </div>
      <div className="co co-r co2">
        <div className="co-title">
          <span className="co-ico"><svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5" /></svg></span>
          <b>Turn posts into a pitch</b>
        </div>
        <ul>{STEPS.map((t) => <li key={t}><Check />{t}</li>)}</ul>
      </div>
      <div className="co co-r co3">
        <div className="co-title">
          <span className="co-ico"><svg viewBox="0 0 24 24"><path d="M5 19V11M10 19V7M15 19v-5M20 19V4" /></svg></span>
          <b>Problem validated</b>
        </div>
        <ul>{CHECKS.map((t) => <li key={t}><Check />{t}</li>)}</ul>
      </div>
      <div className="co co-r co4">
        <div className="co-title">
          <span className="co-ico bulb"><svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></svg></span>
          <b>Ready to build</b>
        </div>
        <p>A pitch with the problem, who faces it, MVP features and a build plan sized to your hackathon.</p>
      </div>
    </div>
  );
}

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
        <Callouts />
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

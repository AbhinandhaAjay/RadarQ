"use client";

import { useEffect, useRef, useState } from "react";
import type { Dictation, Mode } from "@/lib/types";
import { useDictation } from "@/lib/wispr";
import WisprBadge from "./WisprBadge";

const PROMPTS: Record<Mode, string[]> = {
  find: ["what you're into", "what you can build with", "something that annoys you", "the hackathon: time, team, judges"],
  validate: ["the idea, roughly", "who it's for", "why you care", "the hackathon: time, team, judges"],
  compare: ["idea one", "idea two", "why you're building", "the hackathon: time, team, judges"],
};

/** Talking speed for a rough "seconds spoken" meter (about 150 words a minute). */
const WORDS_PER_SECOND = 2.5;
const TARGET_SECONDS = 60;

/**
 * One long Wispr Flow dictation about interests, skills and the hackathon.
 * The text is sent as-is; the brief route untangles it.
 */
export default function RamblePanel({
  mode,
  busy,
  onSubmit,
  onClose,
}: {
  mode: Mode;
  busy: boolean;
  onSubmit: (text: string, dictation: Dictation) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const dictation = useDictation();
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => ref.current?.focus(), []);

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const seconds = Math.round(words / WORDS_PER_SECOND);
  const progress = Math.min(1, seconds / TARGET_SECONDS);
  const ready = words >= 12;

  return (
    <div className="ramble" role="dialog" aria-label="Ramble your idea">
      <div className="ramble-head">
        <div>
          <p className="eyebrow">Ramble mode</p>
          <h3>Ramble your idea. <span className="hand">don't tidy it up</span></h3>
        </div>
        <button type="button" className="note-dismiss" onClick={onClose} aria-label="Close ramble mode">×</button>
      </div>
      <p className="ramble-how">
        Click the box, hold your Wispr key (<kbd>Ctrl</kbd> + <kbd>Win</kbd> on Windows, <kbd>Fn</kbd> on Mac) and talk for 30 to 60 seconds. Ums, restarts and Hinglish are fine. RadarQ turns it into the brief.
      </p>
      <div className="ramble-prompts" aria-label="Things to talk about">
        {PROMPTS[mode].map((p) => (
          <span key={p}>{p}</span>
        ))}
      </div>
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => {
          dictation.onInput(text, e.target.value, e.nativeEvent);
          setText(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && ready) {
            e.preventDefault();
            onSubmit(text, dictation.stats);
          }
        }}
        placeholder="“Okay so, um, I'm a second-year student, I mostly do React… what bugs me is…”"
        rows={7}
        aria-label="Your ramble"
      />
      <div className="ramble-bar">
        <div className="ramble-meter" aria-label={`About ${seconds} seconds of talking`}>
          <span className="ramble-track"><span style={{ transform: `scaleX(${progress})` }} /></span>
          <span className="mono-num">≈ {seconds}s</span>
          <span className="fineprint">{words} words</span>
        </div>
        <WisprBadge d={dictation.stats} />
        <button className="btn primary" disabled={!ready || busy} onClick={() => onSubmit(text, dictation.stats)}>
          {busy ? "Untangling…" : "Turn it into a brief"}
        </button>
      </div>
    </div>
  );
}

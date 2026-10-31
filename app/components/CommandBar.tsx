"use client";

import { useEffect, useRef, useState } from "react";
import type { Dictation } from "@/lib/types";
import { isWispr, measure, useDictation } from "@/lib/wispr";
import WisprBadge from "./WisprBadge";

const EXAMPLES: { group: string; phrases: string[] }[] = [
  { group: "Filter", phrases: ["Show only open gaps", "Only pain four and up", "Clear the filters"] },
  { group: "Ask", phrases: ["Why is #1 ranked first?", "Sabse strong problem kaun sa hai?"] },
  { group: "Decide", phrases: ["Compare the top two", "Argue against the top issue", "Shortlist the top 3 and write the pitch"] },
];

const PLACEHOLDERS = ["“show only open gaps”", "“compare the top two”", "“why is number one first?”", "“argue against the top issue”"];

/** A dictation runs on its own after this pause, so the board can be driven hands-free. */
const AUTO_RUN_MS = 1200;

function speak(text: string) {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-IN";
    u.rate = 1.03;
    window.speechSynthesis.speak(u);
  } catch {
    // Read-aloud is a nicety; ignore browsers without speech synthesis.
  }
}

/** Say (with Wispr Flow) or type a command; the board carries it out and answers back. */
export default function CommandBar({
  onRun,
  onDictated,
}: {
  onRun: (command: string) => Promise<string>;
  onDictated?: (d: Dictation) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<{ q: string; a: string; error?: boolean; dictation?: Dictation } | null>(null);
  const [aloud, setAloud] = useState(true);
  const [autoRun, setAutoRun] = useState(true);
  const [hint, setHint] = useState(0);
  const dictation = useDictation();
  // Typed text never runs on its own; a keystroke after a dictation cancels the auto-run.
  const typedSinceBurst = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setHint((h) => (h + 1) % PLACEHOLDERS.length), 3200);
    return () => clearInterval(t);
  }, []);

  async function run(command: string, d?: Dictation) {
    const q = command.trim();
    if (!q || busy) return;
    setBusy(true);
    setText("");
    if (d) onDictated?.(d);
    dictation.reset();
    try {
      const a = await onRun(q);
      setReply({ q, a, dictation: isWispr(d) ? d : undefined });
      if (aloud && a) speak(a);
    } catch (err) {
      setReply({ q, a: (err as Error).message, error: true });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!autoRun || !dictation.lastBurstAt || typedSinceBurst.current || !text.trim()) return;
    const t = setTimeout(() => run(text, dictation.stats), AUTO_RUN_MS);
    return () => clearTimeout(t);
    // run is recreated every render; the timer only needs to restart when the text or a burst changes.
  }, [text, dictation.lastBurstAt, autoRun]);

  const pending = autoRun && dictation.lastBurstAt > 0 && !typedSinceBurst.current && text.trim() && !busy;

  return (
    <section className="cmd ember-stage" aria-label="Command the board with Wispr Flow or by typing">
      <form
        className="cmd-row"
        onSubmit={(e) => {
          e.preventDefault();
          run(text, dictation.stats);
        }}
      >
        <span className="cmd-key" title="Hold your Wispr key and speak a command">
          <span className="wave" aria-hidden="true"><i /><i /><i /><i /></span>
        </span>
        <input
          className="cmd-input"
          value={text}
          onChange={(e) => {
            const d = measure(text, e.target.value, (e.nativeEvent as InputEvent).inputType);
            typedSinceBurst.current = d.bursts ? false : d.keys ? true : typedSinceBurst.current;
            dictation.onInput(text, e.target.value, e.nativeEvent);
            setText(e.target.value);
          }}
          placeholder={`Hold your Wispr key and say ${PLACEHOLDERS[hint]}`}
          aria-label="Command"
        />
        <button
          type="button"
          className={`cmd-aloud ${aloud ? "on" : ""}`}
          onClick={() => {
            setAloud(!aloud);
            if (aloud) window.speechSynthesis?.cancel();
          }}
          aria-pressed={aloud}
          title={aloud ? "Replies are read aloud" : "Replies are silent"}
        >
          {aloud ? "🔊" : "🔈"}
        </button>
        <button className="btn primary small" type="submit" disabled={!text.trim() || busy}>
          {busy ? "Thinking…" : pending ? "Running…" : "Run"}
        </button>
      </form>
      <div className="cmd-meta">
        <label className="cmd-toggle">
          <input type="checkbox" checked={autoRun} onChange={(e) => setAutoRun(e.target.checked)} />
          No hands: run dictated commands on their own
        </label>
        {isWispr(dictation.stats) && <WisprBadge d={dictation.stats} />}
      </div>
      {reply ? (
        <div className={`cmd-reply ${reply.error ? "error" : ""}`} aria-live="polite">
          <span className="cmd-q">“{reply.q}” {reply.dictation && <WisprBadge d={reply.dictation} />}</span>
          <p>{reply.a || "Done."}</p>
          <button className="note-dismiss" onClick={() => setReply(null)} aria-label="Dismiss">×</button>
        </div>
      ) : (
        <div className="cmd-examples">
          <span className="eyebrow">Say</span>
          {EXAMPLES.map((g) => (
            <span key={g.group} className="cmd-group">
              <span className="cmd-group-label">{g.group}</span>
              {g.phrases.map((e) => (
                <button key={e} className="chip" onClick={() => run(e)} disabled={busy}>“{e}”</button>
              ))}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

"use client";

import { useState } from "react";
import VoiceButton from "./VoiceButton";

const EXAMPLES = [
  "Show only open gaps",
  "Why is #1 ranked first?",
  "Compare the top two",
  "Argue against the top issue",
  "Shortlist the top 3 and write the pitch",
];

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

/** Speak or type a command; the board carries it out and answers back. */
export default function CommandBar({ onRun }: { onRun: (command: string) => Promise<string> }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<{ q: string; a: string; error?: boolean } | null>(null);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState<{ text: string; tone: "info" | "error" } | null>(null);
  const [aloud, setAloud] = useState(true);

  async function run(command: string) {
    const q = command.trim();
    if (!q || busy) return;
    setBusy(true);
    setText("");
    try {
      const a = await onRun(q);
      setReply({ q, a });
      if (aloud && a) speak(a);
    } catch (err) {
      setReply({ q, a: (err as Error).message, error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="cmd ember-stage" aria-label="Command the board by voice or text">
      <form
        className="cmd-row"
        onSubmit={(e) => {
          e.preventDefault();
          run(text);
        }}
      >
        <VoiceButton onTranscript={setText} onDone={run} onListeningChange={setListening} onStatus={setStatus} />
        <input
          className="cmd-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={listening ? "Listening…" : "Ask the radar: “show low-competition problems”, “compare the top two”…"}
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
          {busy ? "Thinking…" : "Run"}
        </button>
      </form>
      {status && !reply && <p className={`cmd-status ${status.tone}`}>{status.text}</p>}
      {reply ? (
        <div className={`cmd-reply ${reply.error ? "error" : ""}`} aria-live="polite">
          <span className="cmd-q">“{reply.q}”</span>
          <p>{reply.a || "Done."}</p>
          <button className="note-dismiss" onClick={() => setReply(null)} aria-label="Dismiss">×</button>
        </div>
      ) : (
        <div className="cmd-examples">
          <span className="eyebrow">Try</span>
          {EXAMPLES.map((e) => (
            <button key={e} className="chip" onClick={() => run(e)} disabled={busy}>{e}</button>
          ))}
        </div>
      )}
    </section>
  );
}

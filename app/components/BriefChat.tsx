"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage, Constraints, Dictation, Mode, Pulled } from "@/lib/types";
import { CONSTRAINT_LABELS, EMPTY_CONSTRAINTS, isEmptyConstraints } from "@/lib/types";
import { post, type RecentSearch } from "@/lib/client";
import { isWispr, useDictation } from "@/lib/wispr";
import CountControl from "./CountControl";
import RamblePanel from "./RamblePanel";
import WisprBadge from "./WisprBadge";

const THEMES = ["Health", "Education", "Climate", "Small business", "Students", "Productivity", "FinTech", "Accessibility", "Agriculture", "Mental health"];

const STARTERS: Record<Mode, { label: string; text: string }[]> = {
  find: [
    { label: "36h health hackathon, team of 3", text: "We're doing a 36-hour healthcare hackathon, team of 3, we know React, judges want social impact" },
    { label: "Paste a hackathon link", text: "https://www.wemakedevs.org/wispr" },
    { label: "No-code, solo, 2 days", text: "No-code track, 2 days, solo, judges want a real problem" },
  ],
  validate: [
    { label: "WhatsApp order tracker for home sellers", text: "My idea: an app that turns WhatsApp chats into an order and payment tracker for small home sellers in India" },
    { label: "AI flashcards from lecture PDFs", text: "My idea: upload lecture PDFs and get flashcards and a quiz for exam revision, for college students" },
  ],
  compare: [
    {
      label: "Flashcards vs internship tracker",
      text: "Idea A: AI flashcards from lecture PDFs for college students. Idea B: a tracker for internship applications across job portals. It's a 2-day no-code hackathon and I want to build something students in India actually use.",
    },
    {
      label: "Clinic reminders vs order tracker",
      text: "Idea A: smarter appointment reminders for small clinics. Idea B: a WhatsApp order and payment tracker for home sellers. 36 hours, team of 3, we know React, judges want social impact.",
    },
  ],
};

const PLACEHOLDERS: Record<keyof Constraints, string> = {
  idea: "What you want to build, and for whom",
  ideaB: "The other idea you're weighing",
  name: "e.g. Smart India Hackathon",
  theme: "e.g. Healthcare access",
  track: "e.g. No-Code",
  timeAvailable: "e.g. 36 hours",
  teamSize: "e.g. 3",
  canCode: "e.g. Yes, React",
  techStack: "e.g. Next.js, Firebase",
  judging: "e.g. Impact, demo",
  notes: "e.g. Focus on India",
};

export const WELCOME: Record<Mode, ChatMessage> = {
  find: {
    role: "assistant",
    content:
      "Tell me about your hackathon: the theme, how long you have, your team, and what the judges care about. You can also paste the hackathon link. Or skip all of it and I'll find today's most common complaints.",
  },
  validate: {
    role: "assistant",
    content: "What's the idea? One or two sentences on what you want to build and who it's for. I'll check real posts for evidence that people need it, and who already does it.",
  },
  compare: {
    role: "assistant",
    content: "Torn between two ideas? Describe both, tell me why you're building, and add the hackathon constraints if you have them. I'll scan real posts for each and tell you which one is worth your time.",
  },
};

const MODE_LABELS: Partial<Record<keyof Constraints, string>> = { idea: "Idea A", ideaB: "Idea B", notes: "Why you're building" };

/** Without the AI, keep what was said in the notes so the scan can still run. */
function keepInNotes(brief: Constraints, said: string): Constraints {
  const notes = [brief.notes, said.trim().slice(0, 400)].filter(Boolean).join(" · ");
  return { ...brief, notes };
}

/** Phrases in the order they were said, so the map reads top to bottom like the ramble. */
function inSpokenOrder(pulled: Pulled[], text: string): Pulled[] {
  const at = (p: Pulled) => {
    const i = text.toLowerCase().indexOf(p.said.toLowerCase());
    return i < 0 ? Infinity : i;
  };
  return [...pulled].sort((a, b) => at(a) - at(b));
}

export default function BriefChat({
  mode,
  setMode,
  messages,
  setMessages,
  brief,
  setBrief,
  issueCount,
  setIssueCount,
  statementCount,
  setStatementCount,
  recent,
  onLaunch,
  notify,
  onDemo,
  dictation,
  onDictated,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  messages: ChatMessage[];
  setMessages: (m: ChatMessage[]) => void;
  brief: Constraints;
  setBrief: (c: Constraints) => void;
  issueCount: number | null;
  setIssueCount: (n: number | null) => void;
  statementCount: number | null;
  setStatementCount: (n: number | null) => void;
  recent: RecentSearch[];
  onLaunch: (brief: Constraints, mode: Mode) => void;
  notify: (msg: string) => void;
  onDemo: () => void;
  /** Everything dictated into this brief so far. */
  dictation: Dictation;
  onDictated: (d: Dictation) => void;
}) {
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [flash, setFlash] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);
  const [rambling, setRambling] = useState(false);
  const typed = useDictation();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Grow the box with its content, up to a cap that depends on the expanded state.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, expanded ? 420 : 200)}px`;
  }, [input, expanded]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  function flashKeys(keys: string[]) {
    if (!keys.length) return;
    setFlash(new Set(keys));
    setTimeout(() => setFlash(new Set()), 1600);
  }

  async function send(text: string, d?: Dictation) {
    const content = text.trim();
    if (!content || thinking) return;
    const next: ChatMessage[] = [...messages, { role: "user", content, dictation: isWispr(d) ? d : undefined }];
    if (d) onDictated(d);
    setMessages(next);
    setInput("");
    typed.reset();
    setThinking(true);
    try {
      const res = await post<{ brief: Constraints; reply: string; usedLink: boolean }>("/api/brief", { messages: next, brief, mode });
      const changed = (Object.keys(EMPTY_CONSTRAINTS) as (keyof Constraints)[]).filter((k) => res.brief[k] !== brief[k]);
      setBrief(res.brief);
      flashKeys(changed);
      setMessages([...next, { role: "assistant", content: res.reply }]);
      if (res.usedLink && changed.length) notify(`Read the page and filled ${changed.length} fields`);
    } catch {
      setBrief(keepInNotes(brief, content));
      flashKeys(["notes"]);
      setMessages([
        ...next,
        { role: "assistant", content: "The AI is busy right now, so I saved what you said in Notes. You can still start the scan, edit the card, or press ▶ Play the demo." },
      ]);
    } finally {
      setThinking(false);
    }
  }

  /** A long Wispr dictation becomes the whole brief in one go. */
  async function ramble(text: string, d: Dictation) {
    const content = text.trim();
    if (!content || thinking) return;
    const next: ChatMessage[] = [...messages, { role: "user", content, dictation: isWispr(d) ? d : undefined }];
    onDictated(d);
    setMessages(next);
    setThinking(true);
    try {
      const res = await post<{ brief: Constraints; pulled: Pulled[]; reply: string }>("/api/ramble", { text: content, brief, mode });
      const changed = (Object.keys(EMPTY_CONSTRAINTS) as (keyof Constraints)[]).filter((k) => res.brief[k] !== brief[k]);
      setBrief(res.brief);
      flashKeys(changed);
      setMessages([...next, { role: "assistant", content: res.reply, pulled: inSpokenOrder(res.pulled, content) }]);
    } catch {
      setBrief(keepInNotes(brief, content));
      flashKeys(["notes"]);
      setMessages([
        ...next,
        { role: "assistant", content: "The AI is busy right now, so I kept your ramble in Notes. You can start the scan with it as is, or try again in a minute." },
      ]);
    } finally {
      setRambling(false);
      setThinking(false);
    }
  }

  const fieldKeys = (Object.keys(EMPTY_CONSTRAINTS) as (keyof Constraints)[]).filter(
    (k) => (k !== "idea" || mode !== "find") && (k !== "ideaB" || mode === "compare")
  );
  const labelOf = (k: keyof Constraints) => (mode === "compare" && MODE_LABELS[k]) || CONSTRAINT_LABELS[k];
  const filled = fieldKeys.filter((k) => brief[k].trim()).length;
  const empty = isEmptyConstraints(brief);
  const noIdea = (mode !== "find" && !brief.idea.trim()) || (mode === "compare" && !brief.ideaB.trim());

  return (
    <section className="section" id="brief">
      <div className="brief-head">
        <div>
          <p className="eyebrow">Stop 01 · Brief</p>
          <h2 className="section-title">{mode === "find" ? (
              <>Tell it what<br /><em>you're building.</em></>
            ) : mode === "validate" ? (
              <>Pitch it<br /><em>to the radar.</em></>
            ) : (
              <>Two ideas.<br /><em>Pick the right one.</em></>
            )}</h2>
        </div>
        <div className="segmented" role="tablist" aria-label="Mode">
          <button role="tab" aria-selected={mode === "find"} className={mode === "find" ? "on" : ""} onClick={() => setMode("find")}>Find problems</button>
          <button role="tab" aria-selected={mode === "validate"} className={mode === "validate" ? "on" : ""} onClick={() => setMode("validate")}>Validate my idea</button>
          <button role="tab" aria-selected={mode === "compare"} className={mode === "compare" ? "on" : ""} onClick={() => setMode("compare")}>Compare two ideas</button>
        </div>
        <button className="btn small brief-example" onClick={onDemo}>▶ Play the demo</button>
      </div>

      <div className="brief">
        <div className="term ember-stage">
          {rambling && <RamblePanel mode={mode} busy={thinking} onSubmit={ramble} onClose={() => setRambling(false)} />}
          <div className="term-head">
            <span className="term-dots" aria-hidden="true"><i /><i /><i /></span>
            <span className="term-title">radar assistant</span>
            <span className="term-status"><span className="live" /> listening</span>
          </div>
          <div className="messages" ref={listRef} aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                <span className="who">{m.role === "assistant" ? "radar" : "you"}</span>
                <div className="msg-body">
                  {m.pulled && m.pulled.length > 0 && (
                    <ol className="pulled" aria-label="What you said, and what it became">
                      {m.pulled.map((p, j) => (
                        <li key={j}>
                          <span className="said">“{p.said}”</span>
                          <span className="arrow" aria-hidden="true">→</span>
                          <span className="became"><b>{labelOf(p.field)}</b> {p.became}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                  <p>{m.content}</p>
                  {m.dictation && <WisprBadge d={m.dictation} />}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="msg assistant">
                <span className="who">radar</span>
                <p className="typing" aria-label="Assistant is typing"><i /><i /><i /></p>
              </div>
            )}
          </div>
          {messages.length <= 1 && !input && (
            <div className="suggest">
              <button className="chip ramble-chip" onClick={() => setRambling(true)}>🎙 Ramble for a minute instead</button>
              {STARTERS[mode].map((s) => (
                <button key={s.label} className="chip" onClick={() => send(s.text)}>{s.label}</button>
              ))}
            </div>
          )}
          <form
            className={`composer ${expanded ? "expanded" : ""}`}
            onSubmit={(e) => {
              e.preventDefault();
              send(input, typed.stats);
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                typed.onInput(input, e.target.value, e.nativeEvent);
                setInput(e.target.value);
              }}
              onKeyDown={(e) => {
                const sendKey = expanded ? e.key === "Enter" && (e.ctrlKey || e.metaKey) : e.key === "Enter" && !e.shiftKey;
                if (sendKey) {
                  e.preventDefault();
                  send(input, typed.stats);
                }
              }}
              placeholder={
                mode === "find"
                  ? "Describe your hackathon: the theme, how long you have, your team, what judges want. Or paste the hackathon link."
                  : mode === "validate"
                    ? "Describe your idea: what you want to build, and who it's for."
                    : "Describe both ideas, why you're building, and the hackathon constraints."
              }
              rows={3}
              aria-label="Message the radar assistant"
            />
            <div className="composer-bar">
              <button type="button" className="ramble-btn" onClick={() => setRambling(true)} title="Hold your Wispr key and talk for a minute">
                <span className="wave" aria-hidden="true"><i /><i /><i /><i /></span>
                Ramble
              </button>
              <span className="composer-hint">
                {isWispr(typed.stats) ? (
                  <WisprBadge d={typed.stats} />
                ) : (
                  <>Hold your Wispr key and talk · {expanded ? "Ctrl + Enter to send" : "Enter to send"}</>
                )}
              </span>
              <button
                type="button"
                className="icon-btn ghost"
                onClick={() => {
                  setExpanded(!expanded);
                  inputRef.current?.focus();
                }}
                aria-label={expanded ? "Shrink the message box" : "Expand the message box"}
                title={expanded ? "Shrink" : "Expand"}
              >
                {expanded ? (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" /></svg>
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                )}
              </button>
              <button className="icon-btn send" type="submit" disabled={!input.trim() || thinking} aria-label="Send">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            </div>
          </form>
        </div>

        <aside className="index-card">
          <div className="card-top">
            <span className="hand">{mode === "find" ? "Our brief" : mode === "validate" ? "The idea" : "The two ideas"}</span>
            <span className="card-count">{filled}/{fieldKeys.length}</span>
          </div>
          <div className="fields">
            {fieldKeys.map((k) => (
              <div key={k} className={`frow ${flash.has(k) ? "flash" : ""} ${k === "idea" || k === "ideaB" ? "idea" : ""}`}>
                <label htmlFor={`f-${k}`}>{labelOf(k)}</label>
                {k === "idea" || k === "ideaB" ? (
                  <textarea id={`f-${k}`} rows={2} value={brief[k]} placeholder={PLACEHOLDERS[k]} onChange={(e) => setBrief({ ...brief, [k]: e.target.value })} />
                ) : (
                  <input id={`f-${k}`} value={brief[k]} placeholder={PLACEHOLDERS[k]} onChange={(e) => setBrief({ ...brief, [k]: e.target.value })} />
                )}
              </div>
            ))}
          </div>
          {isWispr(dictation) && (
            <div className="card-wispr">
              <WisprBadge d={dictation} prefix="Brief dictated with Wispr" />
            </div>
          )}
          {!empty && (
            <button className="btn link small" onClick={() => setBrief(EMPTY_CONSTRAINTS)}>Clear card</button>
          )}
        </aside>
      </div>

      {mode === "find" && (
        <div className="brief-extras">
          <div>
            <p className="eyebrow">Quick themes</p>
            <div className="chips">
              {THEMES.map((t) => (
                <button
                  key={t}
                  className={`chip ${brief.theme === t ? "on" : ""}`}
                  onClick={() => {
                    setBrief({ ...brief, theme: brief.theme === t ? "" : t });
                    flashKeys(["theme"]);
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          {recent.length > 0 && (
            <div>
              <p className="eyebrow">Recent scans</p>
              <div className="chips">
                {recent.map((r) => (
                  <button key={r.at} className="chip" onClick={() => onLaunch(r.brief, "find")} title="Run this scan again">↻ {r.label}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="launch">
        <div className="counts">
          {mode === "find" && <CountControl label="Issues" value={issueCount} onChange={setIssueCount} min={3} max={12} autoStart={6} />}
          <CountControl label="Statements" value={statementCount} onChange={setStatementCount} min={1} max={6} autoStart={3} />
        </div>
        <div className="launch-go">
          {noIdea && <span className="fineprint">{mode === "compare" ? "Describe both ideas first" : "Describe your idea first"}</span>}
          <button className="btn primary big" disabled={noIdea} onClick={() => onLaunch(brief, mode)}>
            {mode === "compare" ? "Compare the ideas" : mode === "validate" ? "Validate the idea" : empty ? "Find today's top issues" : "Start the scan"}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </div>
      </div>
    </section>
  );
}

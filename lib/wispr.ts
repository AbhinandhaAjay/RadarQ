// Tells Wispr Flow dictation apart from typing. Flow inserts a whole dictation
// at once; typing arrives a key at a time. Pasted text also arrives at once, so
// this proves "not typed key by key", not "spoken".

import { useCallback, useState } from "react";
import type { Dictation } from "./types";

export const NO_DICTATION: Dictation = { chars: 0, bursts: 0, keys: 0 };

/** An insertion this long in one input event is treated as a dictation burst. */
const BURST_MIN = 8;

/** Classify one change to a text field, given its value before and after. */
export function measure(before: string, after: string, inputType = ""): Dictation {
  const added = after.length - before.length;
  if (added >= BURST_MIN || (added > 1 && inputType !== "insertText")) return { chars: added, bursts: 1, keys: 0 };
  if (added > 0) return { chars: 0, bursts: 0, keys: added };
  return NO_DICTATION;
}

export function addDictation(a: Dictation, b: Dictation): Dictation {
  return { chars: a.chars + b.chars, bursts: a.bursts + b.bursts, keys: a.keys + b.keys };
}

/** Mostly dictated: a real burst, and far more burst text than keystrokes. */
export function isWispr(d: Dictation | undefined | null): d is Dictation {
  return Boolean(d && d.chars >= 20 && d.chars >= d.keys * 3);
}

const n = (x: number) => x.toLocaleString("en-IN");

export function dictationLabel(d: Dictation): string {
  return `${n(d.chars)} chars in ${d.bursts} burst${d.bursts === 1 ? "" : "s"}${d.keys ? ` · ${n(d.keys)} typed` : " · 0 keystrokes"}`;
}

/**
 * Tracks how the text in one field arrived. Call `onInput(before, after, event)`
 * from the field's onChange; `reset()` when the text is sent.
 */
export function useDictation() {
  const [stats, setStats] = useState<Dictation>(NO_DICTATION);
  const [lastBurstAt, setLastBurstAt] = useState(0);

  const onInput = useCallback((before: string, after: string, native?: Event) => {
    const inputType = (native as InputEvent | undefined)?.inputType ?? "";
    const d = measure(before, after, inputType);
    if (!d.chars && !d.keys) return;
    setStats((s) => addDictation(s, d));
    if (d.bursts) setLastBurstAt(Date.now());
  }, []);

  const reset = useCallback(() => {
    setStats(NO_DICTATION);
    setLastBurstAt(0);
  }, []);

  return { stats, lastBurstAt, onInput, reset };
}

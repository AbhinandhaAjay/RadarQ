import type { Dictation } from "@/lib/types";
import { dictationLabel, isWispr } from "@/lib/wispr";

const WHY =
  "Wispr Flow inserts a whole dictation at once, while typing arrives a key at a time. RadarQ counts both. Pasted text also arrives at once, so this shows the text wasn't typed key by key.";

/** "Wispr Flow detected · 212 chars in 1 burst · 0 keystrokes", or nothing if the text was typed. */
export default function WisprBadge({ d, prefix }: { d: Dictation | null | undefined; prefix?: string }) {
  if (!isWispr(d)) return null;
  return (
    <span className={`wispr-badge ${d.simulated ? "sim" : ""}`} title={d.simulated ? "The saved demo replays a dictation. Nothing was spoken." : WHY}>
      <span className="wispr-dot" aria-hidden="true" />
      <b>{d.simulated ? "Simulated Wispr" : prefix ?? "Wispr Flow detected"}</b>
      <span>{dictationLabel(d)}</span>
    </span>
  );
}

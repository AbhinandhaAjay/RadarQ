export type SourceId = "reddit" | "hackernews" | "bluesky" | "stackexchange";

export type Mode = "find" | "validate" | "compare";

export interface Constraints {
  /** The idea to validate, or idea A when comparing. */
  idea: string;
  /** Idea B, only used when comparing two ideas. */
  ideaB: string;
  name: string;
  theme: string;
  track: string;
  timeAvailable: string;
  teamSize: string;
  canCode: string;
  techStack: string;
  judging: string;
  notes: string;
}

export interface Post {
  id: string;
  source: SourceId;
  title: string;
  text: string;
  url: string;
  community: string;
  score: number;
  createdAt: string;
}

export interface SourceStatus {
  source: SourceId;
  ok: boolean;
  count: number;
  note?: string;
}

export interface Quote {
  text: string;
  url: string;
  source: SourceId;
  community: string;
}

export interface ExistingTool {
  name: string;
  gap: string;
}

export interface Issue {
  id: string;
  title: string;
  summary: string;
  affected: string;
  painScore: number;
  painReason: string;
  fitScore: number;
  fitReason: string;
  mentions: number;
  /** Fetched posts cited as evidence for this issue. */
  postIds: string[];
  /** 0-100: pain x fit, boosted by mentions, reduced when tools exist. */
  opportunity: number;
  sources: SourceId[];
  quotes: Quote[];
  existingTools: ExistingTool[];
}

export interface BuildPhase {
  phase: string;
  tasks: string[];
}

export interface Statement {
  name: string;
  pitch: string;
  title: string;
  problem: string;
  whoFaces: string;
  evidence: string[];
  proposedSolution: string;
  mvpFeatures: string[];
  buildPlan: BuildPhase[];
  demoIdea: string;
  whyItFits: string;
}

/** How a piece of text arrived: whole insertions (Wispr Flow) versus single keystrokes. */
export interface Dictation {
  /** Characters that arrived in multi-character insertions. */
  chars: number;
  /** Number of those insertions. */
  bursts: number;
  /** Characters typed one key at a time. */
  keys: number;
  /** Set on the saved demo run, which replays a dictation rather than receiving one. */
  simulated?: boolean;
}

/** A phrase from a ramble and the brief value it became. */
export interface Pulled {
  field: keyof Constraints;
  said: string;
  became: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  dictation?: Dictation;
  /** Set on a ramble, so the chat can show what each phrase became. */
  pulled?: Pulled[];
}

export const EMPTY_CONSTRAINTS: Constraints = {
  idea: "",
  ideaB: "",
  name: "",
  theme: "",
  track: "",
  timeAvailable: "",
  teamSize: "",
  canCode: "",
  techStack: "",
  judging: "",
  notes: "",
};

export const CONSTRAINT_LABELS: Record<keyof Constraints, string> = {
  idea: "Your idea",
  ideaB: "Idea B",
  name: "Hackathon",
  theme: "Theme",
  track: "Track",
  timeAvailable: "Time",
  teamSize: "Team size",
  canCode: "Coding",
  techStack: "Tech stack",
  judging: "Judges want",
  notes: "Notes",
};

export function isEmptyConstraints(c: Constraints): boolean {
  return Object.values(c).every((v) => !v || !String(v).trim());
}

export interface Validation {
  verdict: "strong" | "some" | "weak";
  demandScore: number;
  headline: string;
  summary: string;
  painPoints: string[];
  evidence: Quote[];
  mentions: number;
  postIds: string[];
  competitors: ExistingTool[];
  risks: string[];
  suggestedAngle: string;
  pivots: string[];
}

export interface DevilObjection {
  point: string;
  detail: string;
  basis: "evidence" | "hypothesis";
  quotes: Quote[];
}

export interface DevilReport {
  verdict: "fragile" | "contested" | "holds";
  headline: string;
  objections: DevilObjection[];
  assumptions: string[];
  killCriteria: string[];
  recommendation: string;
}

export interface Contender {
  label: string;
  description: string;
  posts: Post[];
  quotes?: Quote[];
  tools?: ExistingTool[];
}

export interface ContenderScore {
  label: string;
  description: string;
  pain: number;
  evidence: number;
  competition: number;
  fit: number;
  buildability: number;
  total: number;
  /** Deterministic evidence strength of the cited posts (0-100). */
  strength: number;
  strengthLabel: string;
  strengths: string[];
  weaknesses: string[];
  quotes: Quote[];
}

export interface Comparison {
  a: ContenderScore;
  b: ContenderScore;
  winner: "a" | "b";
  why: string;
  wouldFlip: string[];
  assumptions: string[];
  /** Posts for each side, kept so the winner can be pitched and shared. */
  postsA: Post[];
  postsB: Post[];
}

export type CommandAction =
  | { type: "filter"; minPain?: number; openGapOnly?: boolean; maxTools?: number; sources?: SourceId[]; text?: string }
  | { type: "clearFilters" }
  | { type: "sort"; by: "opportunity" | "fit" | "pain" | "mentions" }
  | { type: "select"; ids: string[]; mode: "add" | "replace" | "clear" }
  | { type: "open"; id: string }
  | { type: "evidence" }
  | { type: "view"; view: "board" | "map" }
  | { type: "compare"; ids: [string, string] }
  | { type: "devil"; id: string }
  | { type: "pitch" };

export const SOURCE_LABELS: Record<SourceId, string> = {
  reddit: "Reddit",
  hackernews: "Hacker News",
  bluesky: "Bluesky",
  stackexchange: "Stack Exchange",
};

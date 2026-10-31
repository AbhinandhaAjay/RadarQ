"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, CommandAction, Comparison, Constraints, Contender, DevilReport, Dictation, Issue, Mode, Post, Pulled, SourceId, SourceStatus, Statement, Validation } from "@/lib/types";
import { EMPTY_CONSTRAINTS, SOURCE_LABELS } from "@/lib/types";
import { briefLabel, interleave, loadRecent, post, saveRecent, toMarkdown, type RecentSearch } from "@/lib/client";
import { decodeShare, encodeShare } from "@/lib/share";
import { evidenceStrength } from "@/lib/evidence";
import type { CommandRow } from "@/lib/prompts";
import { addDictation, NO_DICTATION } from "@/lib/wispr";
import { draftStatements, friendlyError, localCommand } from "@/lib/fallback";
import WisprBadge from "./components/WisprBadge";
import JourneyNav from "./components/JourneyNav";
import { FooterCard, Overheard, Practices, SourceMarquee } from "./components/HomeSections";
import BriefChat, { WELCOME } from "./components/BriefChat";
import ScanView, { type ScanStage } from "./components/ScanView";
import Board from "./components/Board";
import OpportunityMap from "./components/OpportunityMap";
import Drawer from "./components/Drawer";
import IssueDrawer from "./components/IssueDrawer";
import EvidenceDrawer from "./components/EvidenceDrawer";
import ValidationReport from "./components/ValidationReport";
import StatementCard from "./components/StatementCard";
import CompareView from "./components/CompareView";
import CommandBar from "./components/CommandBar";

type View = "home" | "scan" | "board" | "verdict" | "compare" | "pitch";
type SortKey = "opportunity" | "fit" | "pain" | "mentions";
type DrawerState = { kind: "issue"; id: string } | { kind: "evidence" } | null;

const SOURCES: SourceId[] = ["reddit", "hackernews", "bluesky", "stackexchange"];

/** A real run recorded from the live APIs, replayed by "Play the demo" and offered when a live scan fails. */
interface DemoRun {
  ramble: string;
  brief: Constraints;
  pulled: Pulled[];
  reply: string;
  queries: string[];
  status: Partial<Record<SourceId, SourceStatus>>;
  posts: Post[];
  issues: Issue[];
  shortlist: string[];
  statements: Statement[];
}

/** Validator pain points become issue-shaped input for the statements route. */
function issuesFromValidation(v: Validation): Issue[] {
  const pains = v.painPoints.length ? v.painPoints : [v.headline || "The core pain behind the idea"];
  return pains.map((p, i) => ({
    id: `v_${i}`,
    title: p,
    summary: v.summary,
    affected: "",
    painScore: v.verdict === "strong" ? 4 : 3,
    painReason: "",
    fitScore: v.demandScore,
    fitReason: v.suggestedAngle,
    mentions: v.mentions,
    postIds: v.postIds,
    opportunity: v.demandScore,
    sources: [...new Set(v.evidence.map((q) => q.source))],
    quotes: v.evidence,
    existingTools: v.competitors,
  }));
}

/** The winning side of a comparison, shaped as an issue for the statements route. */
function issuesFromComparison(c: Comparison): Issue[] {
  const w = c.winner === "a" ? c.a : c.b;
  const posts = c.winner === "a" ? c.postsA : c.postsB;
  return [
    {
      id: "cmp_winner",
      title: w.label,
      summary: `${w.description} ${c.why}`.trim(),
      affected: "",
      painScore: Math.max(1, Math.min(5, Math.round(w.pain / 2))),
      painReason: "",
      fitScore: w.fit * 10,
      fitReason: w.strengths.join("; "),
      mentions: w.quotes.length,
      postIds: posts.map((p) => p.id),
      opportunity: w.total,
      sources: [...new Set(w.quotes.map((q) => q.source))],
      quotes: w.quotes,
      existingTools: [],
    },
  ];
}

const shortLabel = (idea: string) => {
  const t = idea.trim().replace(/^(idea [ab]:|my idea:)\s*/i, "");
  return t.length > 64 ? `${t.slice(0, 61).trim()}…` : t;
};

interface Toast {
  id: number;
  msg: string;
}

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [mode, setModeState] = useState<Mode>("find");
  const [brief, setBrief] = useState<Constraints>(EMPTY_CONSTRAINTS);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME.find]);
  const [issueCount, setIssueCount] = useState<number | null>(null);
  const [statementCount, setStatementCount] = useState<number | null>(null);
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const [error, setError] = useState("");
  const [shared, setShared] = useState(false);

  // Scan
  const [stage, setStage] = useState<ScanStage>("plan");
  const [queries, setQueries] = useState<string[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [status, setStatus] = useState<Partial<Record<SourceId, SourceStatus>>>({});
  const [searched, setSearched] = useState<Constraints>(EMPTY_CONSTRAINTS);
  const [searchedMode, setSearchedMode] = useState<Mode>("find");

  // Results
  const [issues, setIssues] = useState<Issue[]>([]);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [boardView, setBoardView] = useState<"board" | "map">("board");
  const [sort, setSort] = useState<SortKey>("opportunity");
  const [minPain, setMinPain] = useState(1);
  const [text, setText] = useState("");
  const [hidden, setHidden] = useState<Set<SourceId>>(new Set());
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [openGapOnly, setOpenGapOnly] = useState(false);
  const [maxTools, setMaxTools] = useState<number | null>(null);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [compareFrom, setCompareFrom] = useState<"board" | "brief">("brief");
  const [comparing, setComparing] = useState(false);
  const [devils, setDevils] = useState<Record<string, DevilReport>>({});
  const [devilBusy, setDevilBusy] = useState<string | null>(null);
  const [pitchFrom, setPitchFrom] = useState<View>("board");

  // Pitch
  const [statements, setStatements] = useState<Statement[]>([]);
  const [generating, setGenerating] = useState(false);
  const [pitchBasis, setPitchBasis] = useState(0);

  // Wispr: how the brief arrived, and the snapshot taken when it was scanned.
  const [briefDictation, setBriefDictation] = useState<Dictation>(NO_DICTATION);
  const [sessionDictation, setSessionDictation] = useState<Dictation>(NO_DICTATION);
  const [searchedDictation, setSearchedDictation] = useState<Dictation | null>(null);
  const [offlinePitch, setOfflinePitch] = useState(false);
  const [demo, setDemo] = useState<"playing" | "done" | null>(null);
  const demoRun = useRef<DemoRun | null>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const runId = useRef(0);

  const notify = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  useEffect(() => {
    setRecent(loadRecent());
    const r = decodeShare(window.location.hash);
    if (!r) return;
    setShared(true);
    setModeState(r.mode);
    setSearchedMode(r.mode);
    setBrief(r.brief);
    setSearched(r.brief);
    setQueries(r.queries);
    setStatus(r.status);
    setPosts(r.posts);
    setIssues(r.issues);
    setValidation(r.validation);
    setStatements(r.statements);
    setComparison(r.comparison);
    setSearchedDictation(r.dictation ?? null);
    setCompareFrom(r.mode === "compare" ? "brief" : "board");
    const result: View = r.comparison ? "compare" : r.mode === "validate" ? "verdict" : "board";
    setPitchFrom(result);
    setView(r.statements.length ? "pitch" : result);
  }, []);

  function go(v: View) {
    setView(v);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBrief() {
    setView("home");
    setTimeout(() => document.getElementById("brief")?.scrollIntoView({ behavior: "smooth" }), 60);
  }

  function setMode(m: Mode) {
    if (m === mode) return;
    setModeState(m);
    setMessages([WELCOME[m]]);
  }

  function leaveShared() {
    history.replaceState(null, "", window.location.pathname);
    setShared(false);
    setIssues([]);
    setValidation(null);
    setStatements([]);
    setPosts([]);
    goBrief();
  }

  function clearResults() {
    if (shared) {
      history.replaceState(null, "", window.location.pathname);
      setShared(false);
    }
    setError("");
    setQueries([]);
    setPosts([]);
    setStatus({});
    setIssues([]);
    setValidation(null);
    setComparison(null);
    setDevils({});
    setBoardView("board");
    setSelected(new Set());
    setStatements([]);
    setOfflinePitch(false);
    setDrawer(null);
    setStage("plan");
  }

  async function launch(b: Constraints, m: Mode) {
    const id = ++runId.current;
    clearResults();
    setDemo(null);
    setModeState(m);
    setBrief(b);
    setSearched(b);
    setSearchedMode(m);
    setSearchedDictation(briefDictation);
    if (m === "find") setRecent(saveRecent(b));
    go("scan");

    try {
      if (m === "compare") {
        await launchCompare(b, id);
        return;
      }
      const plan = await post<{ queries: string[]; stackSites: string[] }>("/api/search", { phase: "plan", constraints: b, mode: m });
      if (id !== runId.current) return;
      setQueries(plan.queries);
      setStage("fetch");

      const cap = issueCount && issueCount > 8 ? 18 : 14;
      const all: Post[] = [];
      await Promise.all(
        SOURCES.map(async (source) => {
          try {
            const res = await post<{ posts: Post[]; status: SourceStatus }>("/api/search", {
              phase: "fetch",
              source,
              queries: plan.queries,
              stackSites: plan.stackSites,
              cap,
            });
            if (id !== runId.current) return;
            all.push(...res.posts);
            setPosts((p) => [...p, ...res.posts]);
            setStatus((s) => ({ ...s, [source]: res.status }));
          } catch {
            if (id !== runId.current) return;
            setStatus((s) => ({ ...s, [source]: { source, ok: false, count: 0, note: "Unavailable right now" } }));
          }
        })
      );
      if (id !== runId.current) return;
      if (!all.length) throw new Error("No public discussions matched. Try broader words.");

      setStage("analyze");
      const mixed = interleave(all);
      if (m === "validate") {
        const res = await post<{ validation: Validation }>("/api/validate", { constraints: b, posts: mixed });
        if (id !== runId.current) return;
        setValidation(res.validation);
        go("verdict");
      } else {
        const res = await post<{ issues: Issue[] }>("/api/analyze", { constraints: b, posts: mixed, issueCount });
        if (id !== runId.current) return;
        if (!res.issues.length) throw new Error("We heard posts but no clear issues. Try rephrasing the theme.");
        setIssues(res.issues);
        go("board");
      }
    } catch (err) {
      if (id !== runId.current) return;
      setError(friendlyError(err));
      goBrief();
    }
  }

  async function loadDemo(): Promise<DemoRun> {
    demoRun.current ??= (await import("@/lib/demo-run.json")).default as unknown as DemoRun;
    return demoRun.current;
  }

  /**
   * Replays the saved run on its own: a (simulated) Wispr ramble fills the brief,
   * posts stream in, the board appears, the top issues are shortlisted, and the pitch opens.
   */
  async function playDemo() {
    const id = ++runId.current;
    const d = await loadDemo();
    const wait = (ms: number) => new Promise<boolean>((r) => setTimeout(() => r(id === runId.current), ms));
    const dictated: Dictation = { chars: d.ramble.length, bursts: 1, keys: 0, simulated: true };

    clearResults();
    setDemo("playing");
    setModeState("find");
    setBrief(EMPTY_CONSTRAINTS);
    setMessages([WELCOME.find]);
    goBrief();
    if (!(await wait(900))) return;
    setMessages([WELCOME.find, { role: "user", content: d.ramble, dictation: dictated }]);
    if (!(await wait(1500))) return;
    setBrief(d.brief);
    setBriefDictation(dictated);
    setMessages([WELCOME.find, { role: "user", content: d.ramble, dictation: dictated }, { role: "assistant", content: d.reply, pulled: d.pulled }]);
    if (!(await wait(3800))) return;

    setSearched(d.brief);
    setSearchedMode("find");
    setSearchedDictation(dictated);
    go("scan");
    if (!(await wait(900))) return;
    setQueries(d.queries);
    setStage("fetch");
    for (const source of SOURCES) {
      if (!(await wait(600))) return;
      setPosts((p) => [...p, ...d.posts.filter((x) => x.source === source)]);
      setStatus((s) => ({ ...s, [source]: d.status[source] ?? { source, ok: true, count: 0 } }));
    }
    setStage("analyze");
    if (!(await wait(1500))) return;
    setIssues(d.issues);
    go("board");
    if (!(await wait(3000))) return;
    setSelected(new Set(d.shortlist));
    notify(`Shortlisted the top ${d.shortlist.length} issues`);
    if (!(await wait(1800))) return;
    setPitchFrom("board");
    setPitchBasis(d.shortlist.length);
    setStatements(d.statements);
    go("pitch");
    setDemo("done");
  }

  function stopDemo(restart: boolean) {
    runId.current++;
    setDemo(null);
    if (!restart) return;
    setBrief(EMPTY_CONSTRAINTS);
    setBriefDictation(NO_DICTATION);
    setMessages([WELCOME[mode]]);
    goBrief();
  }

  /** Scan both ideas side by side, then let the AI weigh them. */
  async function launchCompare(b: Constraints, id: number) {
    const sides = [b.idea, b.ideaB].map((idea) => ({ ...b, idea, ideaB: "" }));
    const plans = await Promise.all(
      sides.map((c) => post<{ queries: string[]; stackSites: string[] }>("/api/search", { phase: "plan", constraints: c, mode: "validate" }))
    );
    if (id !== runId.current) return;
    setQueries(plans.flatMap((p) => p.queries));
    setStage("fetch");

    const found: Post[][] = [[], []];
    await Promise.all(
      plans.flatMap((plan, side) =>
        SOURCES.map(async (source) => {
          try {
            const res = await post<{ posts: Post[]; status: SourceStatus }>("/api/search", {
              phase: "fetch",
              source,
              queries: plan.queries,
              stackSites: plan.stackSites,
              cap: 10,
            });
            if (id !== runId.current) return;
            found[side].push(...res.posts);
            setPosts((p) => {
              const seen = new Set(p.map((x) => x.id));
              return [...p, ...res.posts.filter((x) => !seen.has(x.id))];
            });
            setStatus((s) => {
              const prev = s[source];
              const count = (prev?.count ?? 0) + res.status.count;
              return { ...s, [source]: { ...res.status, count, ok: res.status.ok || Boolean(prev?.ok), note: count ? undefined : res.status.note } };
            });
          } catch {
            if (id !== runId.current) return;
            setStatus((s) => (s[source] ? s : { ...s, [source]: { source, ok: false, count: 0, note: "Unavailable right now" } }));
          }
        })
      )
    );
    if (id !== runId.current) return;
    if (!found[0].length && !found[1].length) throw new Error("No public discussions matched either idea. Try describing the problems more broadly.");

    setStage("analyze");
    const contender = (idea: string, list: Post[]): Contender => ({ label: shortLabel(idea), description: idea, posts: interleave(list) });
    const res = await post<{ comparison: Comparison }>("/api/compare", {
      constraints: b,
      a: contender(b.idea, found[0]),
      b: contender(b.ideaB, found[1]),
    });
    if (id !== runId.current) return;
    setComparison(res.comparison);
    setCompareFrom("brief");
    go("compare");
  }

  /** Compare two issues already on the board, using the posts they cite. */
  async function compareIssues(ids: [string, string]) {
    const pair = ids.map((x) => issues.find((i) => i.id === x)).filter((i): i is Issue => Boolean(i));
    if (pair.length !== 2 || comparing) return;
    const byId = new Map(posts.map((p) => [p.id, p]));
    const contender = (i: Issue): Contender => ({
      label: i.title,
      description: i.summary,
      posts: i.postIds.map((x) => byId.get(x)).filter((p): p is Post => Boolean(p)),
      quotes: i.quotes,
      tools: i.existingTools,
    });
    setComparing(true);
    setDrawer(null);
    notify("Comparing the two issues…");
    try {
      const res = await post<{ comparison: Comparison }>("/api/compare", { constraints: searched, a: contender(pair[0]), b: contender(pair[1]) });
      setComparison(res.comparison);
      setCompareFrom("board");
      setDevils(({ cmp: _old, ...rest }) => rest);
      go("compare");
    } catch (err) {
      notify(`Couldn't compare: ${(err as Error).message}`);
    } finally {
      setComparing(false);
    }
  }

  /** Ask the devil's advocate to argue against an issue, the validated idea, or the comparison winner. */
  async function runDevil(key: string, target: { title: string; summary: string; tools: string[] }, evidence: Post[]) {
    if (devilBusy) return;
    setDevilBusy(key);
    try {
      const res = await post<{ report: DevilReport }>("/api/devil", { constraints: searched, target, posts: evidence });
      setDevils((d) => ({ ...d, [key]: res.report }));
    } catch (err) {
      notify(`Couldn't build the case against: ${(err as Error).message}`);
    } finally {
      setDevilBusy(null);
    }
  }

  function devilForIssue(i: Issue) {
    const cited = new Set(i.postIds);
    const ordered = [...posts.filter((p) => cited.has(p.id)), ...posts.filter((p) => !cited.has(p.id))];
    runDevil(i.id, { title: i.title, summary: i.summary, tools: i.existingTools.map((t) => t.name) }, ordered);
  }

  async function generate(opts: { ids?: string[]; from?: View } = {}) {
    const from: View = opts.from ?? (view === "compare" ? "compare" : searchedMode === "validate" ? "verdict" : "board");
    const pick = opts.ids ? new Set(opts.ids) : selected;
    const chosen =
      from === "compare" && comparison
        ? issuesFromComparison(comparison)
        : from === "verdict" && validation
          ? issuesFromValidation(validation)
          : issues.filter((i) => pick.has(i.id));
    if (!chosen.length) return;
    setPitchFrom(from);
    setPitchBasis(chosen.length);
    setGenerating(true);
    setStatements([]);
    setOfflinePitch(false);
    setDrawer(null);
    go("pitch");
    try {
      const res = await post<{ statements: Statement[] }>("/api/statements", { constraints: searched, issues: chosen, statementCount });
      setStatements(res.statements);
    } catch {
      // The quotes are already on hand, so a plain pitch can be drafted from them.
      setStatements(draftStatements(searched, chosen));
      setOfflinePitch(true);
      notify("The AI is busy, so these pitch sheets were drafted straight from the evidence. Press Rewrite to try again.");
    } finally {
      setGenerating(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function copy(value: string, msg: string) {
    try {
      await navigator.clipboard.writeText(value);
      notify(msg);
    } catch {
      notify("Couldn't copy in this browser");
    }
  }

  function share() {
    const link = encodeShare({ mode: searchedMode, brief: searched, queries, status, posts, issues, statements, validation, comparison, dictation: searchedDictation });
    copy(link, "Share link copied. Anyone with it sees these results.");
  }

  function download() {
    const blob = new Blob([toMarkdown(searched, statements, searchedDictation)], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "problem-statements.md";
    a.click();
    URL.revokeObjectURL(url);
    notify("Downloaded problem-statements.md");
  }

  const ranked = useMemo(() => [...issues].sort((a, b) => b.opportunity - a.opportunity), [issues]);
  const rank = useMemo(() => new Map(ranked.map((i, n) => [i.id, n + 1])), [ranked]);

  const visible = useMemo(() => {
    const q = text.trim().toLowerCase();
    const list = issues.filter(
      (i) =>
        i.painScore >= minPain &&
        (!openGapOnly || i.existingTools.length === 0) &&
        (maxTools === null || i.existingTools.length <= maxTools) &&
        i.sources.some((s) => !hidden.has(s)) &&
        (!q || `${i.title} ${i.summary} ${i.affected}`.toLowerCase().includes(q))
    );
    const by: Record<SortKey, (a: Issue, b: Issue) => number> = {
      opportunity: (a, b) => b.opportunity - a.opportunity,
      fit: (a, b) => b.fitScore - a.fitScore || b.opportunity - a.opportunity,
      pain: (a, b) => b.painScore - a.painScore || b.opportunity - a.opportunity,
      mentions: (a, b) => b.mentions - a.mentions || b.opportunity - a.opportunity,
    };
    return [...list].sort(by[sort]);
  }, [issues, minPain, hidden, text, sort, openGapOnly, maxTools]);

  const strengths = useMemo(() => new Map(issues.map((i) => [i.id, evidenceStrength(i.postIds, posts)])), [issues, posts]);
  const strengthLabels = useMemo(() => new Map([...strengths].map(([id, s]) => [id, s.label])), [strengths]);

  function clearFilters() {
    setMinPain(1);
    setOpenGapOnly(false);
    setMaxTools(null);
    setText("");
    setHidden(new Set());
  }

  /** Carry out validated actions from the command route, in order. */
  function runActions(actions: CommandAction[]) {
    let sel = new Set(selected);
    for (const a of actions) {
      switch (a.type) {
        case "filter":
          if (a.minPain !== undefined) setMinPain(a.minPain);
          if (a.openGapOnly !== undefined) setOpenGapOnly(a.openGapOnly);
          if (a.maxTools !== undefined) setMaxTools(a.maxTools);
          if (a.sources?.length) setHidden(new Set(SOURCES.filter((s) => !a.sources!.includes(s))));
          if (a.text !== undefined) setText(a.text);
          break;
        case "clearFilters":
          clearFilters();
          break;
        case "sort":
          setSort(a.by);
          break;
        case "select":
          sel = a.mode === "clear" ? new Set() : a.mode === "add" ? new Set([...sel, ...a.ids]) : new Set(a.ids);
          setSelected(sel);
          break;
        case "open":
          setDrawer({ kind: "issue", id: a.id });
          break;
        case "evidence":
          setDrawer({ kind: "evidence" });
          break;
        case "view":
          setBoardView(a.view);
          break;
        case "compare":
          compareIssues(a.ids);
          return;
        case "devil": {
          const i = issues.find((x) => x.id === a.id);
          if (i) {
            setDrawer({ kind: "issue", id: i.id });
            if (!devils[i.id]) devilForIssue(i);
          }
          break;
        }
        case "pitch":
          if (sel.size) generate({ ids: [...sel], from: "board" });
          return;
      }
    }
  }

  async function runCommand(command: string): Promise<string> {
    const rows: CommandRow[] = ranked.map((i, n) => ({
      id: i.id,
      rank: n + 1,
      title: i.title,
      opportunity: i.opportunity,
      pain: i.painScore,
      fit: i.fitScore,
      mentions: i.mentions,
      platforms: i.sources,
      tools: i.existingTools.length,
      evidence: strengthLabels.get(i.id) ?? "Thin",
      shortlisted: selected.has(i.id),
    }));
    const filters = [
      minPain > 1 && `pain ${minPain}+`,
      openGapOnly && "open gaps only",
      maxTools !== null && `at most ${maxTools} known tools`,
      text && `text "${text}"`,
      hidden.size > 0 && `hiding ${[...hidden].join(", ")}`,
    ]
      .filter(Boolean)
      .join(", ");
    let res: { reply: string; actions: CommandAction[] };
    try {
      res = await post<{ reply: string; actions: CommandAction[] }>("/api/command", { command, rows, filters });
    } catch {
      const local = localCommand(command, rows);
      if (!local) {
        throw new Error("The AI is busy right now. Offline I can still do: “show only open gaps”, “sort by pain”, “compare the top two”, “shortlist the top 3”, “argue against #1”.");
      }
      res = { reply: `${local.reply} (offline)`, actions: local.actions };
    }
    runActions(res.actions);
    return res.reply;
  }

  const foundSources = SOURCES.filter((s) => (status[s]?.count ?? 0) > 0);
  const resultView: View = searchedMode === "compare" ? "compare" : searchedMode === "validate" ? "verdict" : "board";
  const hasResults = searchedMode === "compare" ? Boolean(comparison) : searchedMode === "validate" ? Boolean(validation) : issues.length > 0;
  const steps = [
    { label: "Brief", view: "home" as View, enabled: true },
    { label: "Scan", view: "scan" as View, enabled: false },
    { label: searchedMode === "compare" ? "Compare" : searchedMode === "validate" ? "Verdict" : "Board", view: resultView, enabled: hasResults },
    { label: "Pitch", view: "pitch" as View, enabled: statements.length > 0 || generating },
  ];
  // Comparing two board issues is a detour from the board stop, not a new stop.
  const current = view === "compare" ? 2 : Math.max(0, steps.findIndex((s) => s.view === view));
  const drawerIssue = drawer?.kind === "issue" ? issues.find((i) => i.id === drawer.id) : undefined;

  return (
    <>
      <JourneyNav
        steps={steps}
        current={current}
        onHome={() => go("home")}
        onGo={(i) => (steps[i].view === "home" ? goBrief() : go(steps[i].view))}
        onDemo={playDemo}
        dictation={sessionDictation}
      />

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">{t.msg}</div>
        ))}
      </div>

      {demo && !shared && (
        <div className="shared-banner demo-banner">
          <div className="wrap">
            <span>
              <span className="hand">{demo === "playing" ? "demo playing" : "that was the demo"}</span>
              {demo === "playing"
                ? "A saved run: a simulated Wispr ramble, then real posts and real AI output. It moves on its own."
                : "Everything here came from a saved run. Ramble your own brief to scan live."}
            </span>
            <span className="chips">
              {demo === "playing" && <button className="btn small" onClick={() => stopDemo(false)}>Stop here</button>}
              <button className="btn small primary" onClick={() => stopDemo(true)}>Ramble your own</button>
            </span>
          </div>
        </div>
      )}

      {shared && (
        <div className="shared-banner">
          <div className="wrap">
            <span><span className="hand">shared with you</span> These are someone's RadarQ results.</span>
            <button className="btn small" onClick={leaveShared}>Start your own scan</button>
          </div>
        </div>
      )}

      <main className={`app-main ${view === "home" ? "is-home" : ""} ${shared || demo ? "has-banner" : ""}`}>
        {view === "home" && (
          <div className="view" key="home">
            <div className="wrap">
            {error && (
              <div className="error" role="alert">
                <span>{error}</span>
                <span className="chips">
                  <button className="btn small primary" onClick={playDemo}>▶ Show a saved run instead</button>
                  <button className="btn small" onClick={() => launch(searched, searchedMode)}>Try again</button>
                  <button className="btn small" onClick={() => setError("")}>Dismiss</button>
                </span>
              </div>
            )}
            <BriefChat
              mode={mode}
              setMode={setMode}
              messages={messages}
              setMessages={setMessages}
              brief={brief}
              setBrief={setBrief}
              issueCount={issueCount}
              setIssueCount={setIssueCount}
              statementCount={statementCount}
              setStatementCount={setStatementCount}
              recent={recent}
              onLaunch={launch}
              notify={notify}
              dictation={briefDictation}
              onDictated={(d) => {
                setBriefDictation((b) => addDictation(b, d));
                setSessionDictation((s) => addDictation(s, d));
              }}
            />
            <SourceMarquee />
            <Overheard />
            <Practices />
            </div>
            <FooterCard
              onStart={() => {
                setMode("find");
                goBrief();
              }}
            />
          </div>
        )}

        {view === "scan" && (
          <div className="wrap" key="scan">
          <ScanView key="scan" mode={searchedMode} stage={stage} queries={queries} posts={posts} status={status} label={searchedMode === "compare" ? "two ideas" : searchedMode === "validate" ? "your idea" : briefLabel(searched)} />
          </div>
        )}

        {view === "board" && (
          <div className="view wrap" key="board">
            <header className="results-head">
              <div>
                <p className="eyebrow">Stop 03 · Board · {briefLabel(searched)}</p>
                <h2 className="section-title">
                  <span className="mono-num">{issues.length}</span> problems<br /><em>people keep raising.</em>
                </h2>
                <p className="meta-line">
                  {posts.length} posts · {foundSources.length} sources · searched {queries.map((q) => `“${q}”`).join(", ")}
                  {SOURCES.filter((s) => status[s]?.note).map((s) => (
                    <span key={s} className="soft-note"> · {SOURCE_LABELS[s]} {status[s]?.note?.toLowerCase()}</span>
                  ))}
                </p>
              </div>
              <div className="chips">
                <button className="btn small" onClick={() => setDrawer({ kind: "evidence" })}>Inspect {posts.length} posts</button>
                <button className="btn small" onClick={share}>Share board</button>
                <button className="btn small" onClick={() => launch(searched, "find")}>Scan again</button>
                <button className="btn small link" onClick={goBrief}>Edit brief</button>
              </div>
            </header>

            <CommandBar onRun={runCommand} onDictated={(d) => setSessionDictation((s) => addDictation(s, d))} />

            <div className="toolbar">
              {(openGapOnly || maxTools !== null || minPain > 1 || text || hidden.size > 0) && (
                <button className="chip on" onClick={clearFilters} title="Clear every filter">Filtered · clear ×</button>
              )}
              <div className="segmented small" role="tablist" aria-label="Board view">
                <button role="tab" aria-selected={boardView === "board"} className={boardView === "board" ? "on" : ""} onClick={() => setBoardView("board")}>Sticky board</button>
                <button role="tab" aria-selected={boardView === "map"} className={boardView === "map" ? "on" : ""} onClick={() => setBoardView("map")}>Opportunity map</button>
              </div>
              <input className="input search" placeholder="Filter notes…" value={text} onChange={(e) => setText(e.target.value)} aria-label="Filter issues" />
              <select className="select" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort issues">
                <option value="opportunity">by opportunity</option>
                <option value="fit">by fit</option>
                <option value="pain">by pain</option>
                <option value="mentions">by mentions</option>
              </select>
              <select className="select" value={minPain} onChange={(e) => setMinPain(Number(e.target.value))} aria-label="Minimum pain">
                <option value={1}>any pain</option>
                <option value={3}>pain 3+</option>
                <option value={4}>pain 4+</option>
              </select>
              <div className="chips">
                {foundSources.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="chip"
                    aria-pressed={!hidden.has(s)}
                    onClick={() => setHidden((h) => { const n = new Set(h); n.has(s) ? n.delete(s) : n.add(s); return n; })}
                  >
                    <span className={`sdot ${s}`} /> {SOURCE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {boardView === "board" ? (
              <Board
                issues={visible}
                ranked={ranked}
                rank={rank}
                selected={selected}
                setSelected={setSelected}
                onOpen={(id) => setDrawer({ kind: "issue", id })}
                statementCount={statementCount}
                setStatementCount={setStatementCount}
                onGenerate={() => generate({ from: "board" })}
                onCompare={compareIssues}
                evidence={strengthLabels}
              />
            ) : (
              <div className="map-layout">
                <OpportunityMap issues={visible} rank={rank} selected={selected} onSelect={(id) => setDrawer({ kind: "issue", id })} />
                <div className="map-bar">
                  <span><span className="mono-num">{selected.size}</span> shortlisted</span>
                  <button className="btn link small" onClick={() => setBoardView("board")}>Open the board to shortlist</button>
                  <button className="btn primary" disabled={!selected.size} onClick={() => generate({ from: "board" })}>Write the pitch</button>
                </div>
              </div>
            )}
            <p className="fineprint spaced">Quotes and links are copied straight from public posts. Opportunity scores and existing tools are AI estimates.</p>
          </div>
        )}

        {view === "verdict" && validation && (
          <div className="wrap" key="verdict">
          <ValidationReport
            brief={searched}
            v={validation}
            postCount={posts.length}
            statementCount={statementCount}
            setStatementCount={setStatementCount}
            onPitch={() => generate({ from: "verdict" })}
            onEvidence={() => setDrawer({ kind: "evidence" })}
            devil={devils.idea}
            devilLoading={devilBusy === "idea"}
            onDevil={() =>
              runDevil("idea", { title: searched.idea, summary: validation.summary, tools: validation.competitors.map((c) => c.name) }, posts)
            }
            onShare={share}
            onAnother={() => {
              setMode("validate");
              setBrief({ ...searched, idea: "" });
              goBrief();
            }}
          />
          </div>
        )}

        {view === "compare" && comparison && (
          <div className="wrap" key="compare">
            <CompareView
              c={comparison}
              postCount={comparison.postsA.length + comparison.postsB.length}
              statementCount={statementCount}
              setStatementCount={setStatementCount}
              onPitch={() => generate({ from: "compare" })}
              onShare={share}
              onEvidence={posts.length ? () => setDrawer({ kind: "evidence" }) : undefined}
              onBack={() => {
                if (compareFrom === "board") {
                  go("board");
                } else {
                  setMode("compare");
                  setBrief({ ...searched, idea: "", ideaB: "" });
                  goBrief();
                }
              }}
              backLabel={compareFrom === "board" ? "← Back to the board" : "Compare two other ideas"}
              devil={devils.cmp}
              devilLoading={devilBusy === "cmp"}
              onDevil={() => {
                const w = comparison.winner === "a" ? comparison.a : comparison.b;
                runDevil("cmp", { title: w.label, summary: w.description, tools: [] }, comparison.winner === "a" ? comparison.postsA : comparison.postsB);
              }}
            />
          </div>
        )}

        {view === "pitch" && (
          <div className="view wrap" key="pitch">
            <header className="results-head">
              <div>
                <p className="eyebrow">Stop 04 · Pitch · {pitchFrom === "compare" ? "the winning idea" : searchedMode === "validate" ? "your idea" : briefLabel(searched)}</p>
                <h2 className="section-title">{generating ? <>Writing<br /><em>your pitch…</em></> : <>Ready<br /><em>to submit.</em></>}</h2>
                <p className="meta-line">
                  {pitchBasis
                    ? `Built from ${pitchBasis} ${pitchFrom === "compare" ? "winning idea" : pitchFrom === "verdict" ? "validated pain point" : "shortlisted issue"}${pitchBasis === 1 ? "" : "s"}, each backed by real posts.`
                    : "Every pitch is grounded in quotes from real public posts."}
                </p>
                <WisprBadge d={searchedDictation} prefix="Brief dictated with Wispr" />
              </div>
              <div className="chips no-print">
                <button className="btn small link" onClick={() => go(pitchFrom)}>← Back</button>
                <button className="btn small" disabled={generating || shared} onClick={() => generate({ from: pitchFrom })}>Rewrite</button>
                <button className="btn small" disabled={generating || !statements.length} onClick={() => copy(toMarkdown(searched, statements, searchedDictation), "Copied every pitch")}>Copy all</button>
                <button className="btn small" disabled={generating || !statements.length} onClick={download}>Download .md</button>
                <button className="btn small" disabled={generating || !statements.length} onClick={share}>Share</button>
                <button className="btn small primary" disabled={generating || !statements.length} onClick={() => window.print()}>Save as PDF</button>
              </div>
            </header>
            <section className="statements">
              {generating
                ? Array.from({ length: statementCount ?? 3 }, (_, i) => (
                    <div key={i} className="stmt skeleton-sheet">
                      <div className="skeleton" style={{ height: 12, width: 120 }} />
                      <div className="skeleton" style={{ height: 34, width: "40%" }} />
                      <div className="skeleton" style={{ height: 16, width: "65%" }} />
                      <div className="skeleton" style={{ height: 80 }} />
                    </div>
                  ))
                : statements.map((s, i) => (
                    <StatementCard
                      key={i}
                      s={s}
                      index={i}
                      dictation={searchedDictation}
                      offline={offlinePitch}
                      onCopy={() => copy(toMarkdown(searched, [s], searchedDictation), `Copied “${s.name || s.title}”`)}
                    />
                  ))}
            </section>
          </div>
        )}

        {view !== "home" && (
          <footer className="footer wrap">
            <span>RadarQ · built by voice with Wispr Flow for the WeMakeDevs No Hands Challenge</span>
            <span>Public data from Reddit, Hacker News, Bluesky and Stack Exchange</span>
          </footer>
        )}
      </main>

      <Drawer open={drawer !== null} onClose={() => setDrawer(null)} label={drawer?.kind === "evidence" ? "Evidence explorer" : "Issue details"}>
        {drawer?.kind === "evidence" && (
          <EvidenceDrawer posts={posts} issues={issues} rank={rank} onOpenIssue={(id) => setDrawer({ kind: "issue", id })} />
        )}
        {drawerIssue && (
          <IssueDrawer
            issue={drawerIssue}
            rank={rank.get(drawerIssue.id) ?? 0}
            posts={posts}
            selected={selected.has(drawerIssue.id)}
            onToggle={() => toggle(drawerIssue.id)}
            strength={strengths.get(drawerIssue.id) ?? evidenceStrength(drawerIssue.postIds, posts)}
            devil={devils[drawerIssue.id]}
            devilLoading={devilBusy === drawerIssue.id}
            onDevil={() => devilForIssue(drawerIssue)}
          />
        )}
      </Drawer>
    </>
  );
}

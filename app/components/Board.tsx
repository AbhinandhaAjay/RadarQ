"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

// Drop where the pointer is; fall back to overlap for keyboard or touch edge cases.
const dropUnderPointer: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};
import type { Issue } from "@/lib/types";
import StickyNote, { type Tier } from "./StickyNote";
import CountControl from "./CountControl";

const LANES: { tier: Tier; title: string; hint: string }[] = [
  { tier: "build", title: "Build this", hint: "highest opportunity" },
  { tier: "worth", title: "Worth a look", hint: "solid, needs an angle" },
  { tier: "crowded", title: "Crowded or weak", hint: "tools exist or thin evidence" },
];

const TIERS: Tier[] = ["build", "worth", "crowded"];

/** Lanes by opportunity rank in thirds; an issue with 3+ known tools drops one lane. */
export function tierOf(issue: Issue, rankIndex: number, total: number): Tier {
  const third = Math.max(1, Math.ceil(total / 3));
  const base = rankIndex < third ? 0 : rankIndex >= total - Math.floor(total / 3) ? 2 : 1;
  return TIERS[Math.min(2, base + (issue.existingTools.length >= 3 ? 1 : 0))];
}

function DraggableNote(props: {
  issue: Issue;
  rank: number;
  tier: Tier;
  selected: boolean;
  evidence?: string;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: props.issue.id, data: { from: "board" } });
  return (
    <div
      ref={setNodeRef}
      className="note-slot"
      {...listeners}
      {...attributes}
      aria-label={`${props.issue.title}. Opportunity ${props.issue.opportunity}. Open details, or drag to the shortlist.`}
      onClick={props.onOpen}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), props.onOpen())}
    >
      <StickyNote
        issue={props.issue}
        rank={props.rank}
        tier={props.tier}
        selected={props.selected}
        evidence={props.evidence}
        onToggle={props.onToggle}
        dragging={isDragging}
      />
    </div>
  );
}

function ShortItem({ issue, rank, onRemove, onOpen }: { issue: Issue; rank: number; onRemove: () => void; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `sl:${issue.id}`, data: { from: "shortlist", issueId: issue.id } });
  return (
    <li ref={setNodeRef} className={`short-item ${isDragging ? "ghost" : ""}`} {...listeners} {...attributes} tabIndex={-1}>
      <span className="note-rank">#{rank}</span>
      <button className="short-title" onClick={onOpen} onPointerDown={(e) => e.stopPropagation()}>{issue.title}</button>
      <button className="short-x" onClick={onRemove} onPointerDown={(e) => e.stopPropagation()} aria-label={`Remove ${issue.title}`}>×</button>
    </li>
  );
}

/** The drop zone. It must render inside DndContext for useDroppable to see the drag. */
function ShortlistDrop({ armed, children }: { armed: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "shortlist" });
  return (
    <aside ref={setNodeRef} className={`shortlist ${isOver ? "over" : ""} ${armed ? "armed" : ""}`} aria-label="Shortlist">
      {children}
    </aside>
  );
}

export default function Board({
  issues,
  ranked,
  rank,
  selected,
  setSelected,
  onOpen,
  statementCount,
  setStatementCount,
  onGenerate,
  onCompare,
  evidence,
}: {
  issues: Issue[];
  ranked: Issue[];
  rank: Map<string, number>;
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  onOpen: (id: string) => void;
  statementCount: number | null;
  setStatementCount: (n: number | null) => void;
  onGenerate: () => void;
  onCompare: (ids: [string, string]) => void;
  evidence: Map<string, string>;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } })
  );

  const tiers = new Map(ranked.map((i, n) => [i.id, tierOf(i, n, ranked.length)]));
  // The top-ranked issue always has a place in "Build this", even in a crowded field.
  if (ranked.length && ![...tiers.values()].includes("build")) tiers.set(ranked[0].id, "build");
  const byId = new Map(ranked.map((i) => [i.id, i]));
  const add = (id: string) => setSelected(new Set(selected).add(id));
  const remove = (id: string) => {
    const next = new Set(selected);
    next.delete(id);
    setSelected(next);
  };
  const toggle = (id: string) => (selected.has(id) ? remove(id) : add(id));

  function onDragStart(e: DragStartEvent) {
    const data = e.active.data.current as { from: string; issueId?: string };
    setActiveId(data.from === "shortlist" ? data.issueId! : String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    const data = e.active.data.current as { from: string; issueId?: string };
    if (data.from === "board" && e.over?.id === "shortlist") add(String(e.active.id));
    if (data.from === "shortlist" && e.over?.id !== "shortlist") remove(data.issueId!);
    setActiveId(null);
  }

  const active = activeId ? byId.get(activeId) : undefined;
  const picked = ranked.filter((i) => selected.has(i.id));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={dropUnderPointer}
      // The shortlist is sticky, so its position changes as the page scrolls mid-drag.
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
      <div className="board-layout">
        <div className="corkboard ember-stage">
          {LANES.map((lane) => {
            const notes = issues.filter((i) => tiers.get(i.id) === lane.tier);
            return (
              <section key={lane.tier} className={`lane ${lane.tier}`}>
                <header>
                  <h3>{lane.title}</h3>
                  <span className="mono-label">{String(notes.length).padStart(2, "0")} · {lane.hint}</span>
                </header>
                <div className="lane-notes">
                  {notes.length === 0 && <p className="lane-empty">Nothing here</p>}
                  {notes.map((issue) => (
                    <DraggableNote
                      key={issue.id}
                      issue={issue}
                      rank={rank.get(issue.id) ?? 0}
                      tier={lane.tier}
                      selected={selected.has(issue.id)}
                      evidence={evidence.get(issue.id)}
                      onOpen={() => onOpen(issue.id)}
                      onToggle={() => toggle(issue.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <ShortlistDrop armed={Boolean(activeId)}>
          <header>
            <h3>Shortlist</h3>
            <span className="hand">{picked.length ? `${picked.length} picked` : "drop notes here"}</span>
          </header>
          {picked.length === 0 ? (
            <div className="short-empty">
              <p>Drag notes in here, or tap the tick on a note. Pick two to compare them.</p>
              <button className="btn small" onClick={() => setSelected(new Set(ranked.slice(0, 3).map((i) => i.id)))}>Pick the top 3 for me</button>
            </div>
          ) : (
            <ul className="short-list">
              {picked.map((i) => (
                <ShortItem key={i.id} issue={i} rank={rank.get(i.id) ?? 0} onRemove={() => remove(i.id)} onOpen={() => onOpen(i.id)} />
              ))}
            </ul>
          )}
          <div className="short-foot">
            <CountControl label="Statements" value={statementCount} onChange={setStatementCount} min={1} max={6} autoStart={3} />
            {picked.length === 2 && (
              <button className="btn" onClick={() => onCompare([picked[0].id, picked[1].id])}>
                Compare these two
              </button>
            )}
            <button className="btn primary" disabled={!picked.length} onClick={onGenerate}>
              Write the pitch
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
            {picked.length > 0 && (
              <button className="btn link small" onClick={() => setSelected(new Set())}>Clear shortlist</button>
            )}
          </div>
        </ShortlistDrop>
      </div>

      <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
        {active ? (
          <StickyNote issue={active} rank={rank.get(active.id) ?? 0} tier={tiers.get(active.id) ?? "worth"} selected={selected.has(active.id)} overlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

"use client";

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  closestCorners,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatDuration, itemTitle, pad2, type Module, type ModuleItem } from "@/lib/mock";
import { Badge, Button, ConfirmDialog, DropdownMenu, EmptyState, Icon, toast, useIsClient, type MenuItem } from "@/components/app";
import { ItemEditorDrawer } from "./ItemEditors";
import { firstVideoId, itemLabel, newModule, newQuiz, newResource, newVideo, quizProblems, resourceMeta } from "./utils";

/* =============================================================================
   Curriculum editor: modules (drag to reorder) with items (drag to reorder and
   between modules). Pointer drags use dnd-kit (the overlay is portalled to
   <body> so no transformed ancestor offsets it). Keyboard moves are handled
   here, one slot per arrow press, so they're exact and predictable: focus a
   handle, Space/Enter to pick up, arrows to move (an item crosses into the
   next or previous module at the edges), Space/Enter to drop, Esc to cancel.
   Every action also exists in the menus for people who don't drag at all.
   ============================================================================= */

type Kind = ModuleItem["type"];
/** a drag handle (m|… / i|…), the "More actions" menu next to a handle, a module's "Add lesson" button or any selector */
type FocusTarget = { handle: string } | { menuOf: string } | { add: string } | { selector: string };

function resolveFocus(t: FocusTarget): HTMLElement | null {
  const handleEl = (id: string) => document.querySelector<HTMLElement>(`[data-dnd-handle="${window.CSS.escape(id)}"]`);
  if ("handle" in t) return handleEl(t.handle);
  if ("menuOf" in t) return handleEl(t.menuOf)?.closest<HTMLElement>("[data-focus-row]")?.querySelector<HTMLElement>('button[aria-haspopup="menu"]') ?? null;
  if ("add" in t) return document.getElementById(`module-${t.add}`)?.querySelector<HTMLElement>('button[aria-label="Add lesson"]') ?? null;
  return document.querySelector<HTMLElement>(t.selector);
}
type EditorState = { isNew: boolean; moduleId: string; index: number; item: ModuleItem; key: number } | null;

const M = (id: string) => `m|${id}`;
const I = (id: string) => `i|${id}`;
const Z = (id: string) => `z|${id}`;
const raw = (id: UniqueIdentifier) => String(id).slice(2);

const TYPE_UI: Record<Kind, { icon: "video" | "quiz" | "file"; chip: string }> = {
  video: { icon: "video", chip: "bg-[#dfe8ff] text-blue" },
  quiz: { icon: "quiz", chip: "bg-butter text-[#6b5400]" },
  resource: { icon: "file", chip: "bg-mint text-forest" },
};

export function CurriculumEditor({
  courseId,
  modules,
  onChange,
}: {
  courseId: string;
  modules: Module[];
  /** save=false while dragging (local preview only) */
  onChange: (next: Module[], opts?: { save?: boolean }) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const snapshot = useRef<Module[] | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [renaming, setRenaming] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(null);
  const [confirm, setConfirm] = useState<{ title: string; description: string; run: () => void } | null>(null);
  const editorSeq = useRef(0);
  /** touch screens: drag handles are hidden, a "Reorder" mode swaps the row menus for 44px up/down buttons */
  const [reorder, setReorder] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const freeId = firstVideoId(modules);
  const isClient = useIsClient();
  /** keyboard move in progress: the picked-up handle id (m|... / i|...) and the order before it started */
  const [kb, setKb] = useState<{ id: string; snapshot: Module[] } | null>(null);
  const [liveMsg, setLiveMsg] = useState("");
  /** where focus goes after the next render: a list of candidates, the first one that exists wins */
  const pendingFocus = useRef<FocusTarget[] | null>(null);
  // after a move or delete re-renders (an item may remount in another module, or vanish), put focus somewhere sensible
  useLayoutEffect(() => {
    if (!pendingFocus.current) return;
    const targets = pendingFocus.current;
    pendingFocus.current = null;
    for (const t of targets) {
      const el = resolveFocus(t);
      if (el) {
        el.focus({ preventScroll: true });
        el.scrollIntoView({ block: "nearest" });
        return;
      }
    }
  });
  const focusAfter = (...targets: FocusTarget[]) => {
    pendingFocus.current = targets;
  };

  const index = useMemo(() => {
    const itemModule = new Map<string, string>();
    const titles = new Map<string, string>();
    for (const m of modules) {
      titles.set(M(m.id), `module ${m.title}`);
      for (const it of m.items) {
        itemModule.set(it.id, m.id);
        titles.set(I(it.id), `${itemLabel(it.type).toLowerCase()} ${itemTitle(it) || "untitled"}`);
      }
    }
    return { itemModule, titles };
  }, [modules]);

  const containerOf = (id: UniqueIdentifier) => {
    const s = String(id);
    if (s.startsWith("z|") || s.startsWith("m|")) return raw(id);
    return index.itemModule.get(raw(id)) ?? null;
  };

  const collision: CollisionDetection = (args) => {
    const type = args.active.data.current?.type;
    if (type === "module") return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => c.data.current?.type === "module") });
    const containers = args.droppableContainers.filter((c) => c.data.current?.type !== "module");
    const hits = pointerWithin({ ...args, droppableContainers: containers });
    if (hits.length) {
      const item = hits.find((h) => String(h.id).startsWith("i|") && h.id !== args.active.id);
      return item ? [item] : hits;
    }
    return closestCorners({ ...args, droppableContainers: containers });
  };

  /* ------------------------------------------------------------------ mutations */
  const commit = (next: Module[], msg?: string) => {
    onChange(next, { save: true });
    if (msg) toast(msg);
  };
  const patchModule = (id: string, f: Partial<Module>) => commit(modules.map((m) => (m.id === id ? { ...m, ...f } : m)));
  const moveItemTo = (itemId: string, toModule: string, toIndex: number, list = modules) => {
    const from = list.find((m) => m.items.some((i) => i.id === itemId));
    if (!from) return list;
    const it = from.items.find((i) => i.id === itemId)!;
    const without = list.map((m) => (m.id === from.id ? { ...m, items: m.items.filter((i) => i.id !== itemId) } : m));
    return without.map((m) => {
      if (m.id !== toModule) return m;
      const items = [...m.items];
      items.splice(Math.max(0, Math.min(toIndex, items.length)), 0, { ...it, moduleId: m.id });
      return { ...m, items };
    });
  };

  const openNew = (kind: Kind, moduleId: string, at: number) => {
    const item = kind === "video" ? newVideo(moduleId) : kind === "quiz" ? newQuiz(moduleId) : newResource(moduleId);
    setEditor({ isNew: true, moduleId, index: at, item, key: ++editorSeq.current });
  };
  const openEdit = (moduleId: string, item: ModuleItem) => setEditor({ isNew: false, moduleId, index: 0, item, key: ++editorSeq.current });

  const saveItem = (item: ModuleItem) => {
    if (!editor) return;
    if (editor.isNew) {
      commit(
        modules.map((m) => {
          if (m.id !== editor.moduleId) return m;
          const items = [...m.items];
          items.splice(editor.index, 0, { ...item, moduleId: m.id });
          return { ...m, items };
        }),
      );
      toast.success(`${itemLabel(item.type)} added`, { description: itemTitle(item) });
    } else {
      commit(modules.map((m) => ({ ...m, items: m.items.map((i) => (i.id === item.id ? item : i)) })));
      toast.success("Changes saved", { description: itemTitle(item) });
    }
    setEditor(null);
  };

  const deleteItem = (m: Module, it: ModuleItem) =>
    setConfirm({
      title: `Delete "${itemTitle(it) || "this item"}"?`,
      description: it.type === "quiz" ? "The test and its questions are removed. Learner attempts stay in your analytics." : "It disappears from the curriculum straight away.",
      run: () => {
        // focus the next item, else the previous one, else the module's "Add lesson" button
        const i = m.items.findIndex((x) => x.id === it.id);
        const next = m.items[i + 1];
        const prev = m.items[i - 1];
        focusAfter(...[next && { handle: I(next.id) }, prev && { handle: I(prev.id) }, { add: m.id }].filter(Boolean) as FocusTarget[]);
        commit(modules.map((x) => (x.id === m.id ? { ...x, items: x.items.filter((i) => i.id !== it.id) } : x)), `${itemLabel(it.type)} deleted`);
      },
    });
  const deleteModule = (m: Module) =>
    setConfirm({
      title: `Delete "${m.title}"?`,
      description: m.items.length ? `This also deletes its ${m.items.length} ${m.items.length === 1 ? "item" : "items"}. You can't undo this.` : "It's empty, so nothing else is lost.",
      run: () => {
        // focus the next module's handle, else the previous one, else "Add module"
        const i = modules.findIndex((x) => x.id === m.id);
        const next = modules[i + 1];
        const prev = modules[i - 1];
        focusAfter(...[next && { handle: M(next.id) }, prev && { handle: M(prev.id) }, { selector: "[data-add-module]" }].filter(Boolean) as FocusTarget[]);
        commit(modules.filter((x) => x.id !== m.id), "Module deleted");
      },
    });
  const addModule = () => {
    const nm = newModule(courseId, modules.length + 1);
    commit([...modules, nm]);
    setRenaming(nm.id);
    requestAnimationFrame(() => document.getElementById(`module-${nm.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
  };

  /* ------------------------------------------------------------------ drag */
  const onDragStart = (e: DragStartEvent) => {
    snapshot.current = modules;
    setActiveId(String(e.active.id));
  };
  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || active.data.current?.type !== "item") return;
    const from = containerOf(active.id);
    const to = containerOf(over.id);
    if (!from || !to || from === to) return;
    const target = modules.find((m) => m.id === to)!;
    let at = target.items.length;
    if (String(over.id).startsWith("i|")) {
      const overIdx = target.items.findIndex((i) => i.id === raw(over.id));
      const below = active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height / 2;
      at = overIdx + (below ? 1 : 0);
    }
    onChange(moveItemTo(raw(active.id), to, at), { save: false });
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) {
      if (snapshot.current) onChange(snapshot.current, { save: false });
      return;
    }
    const id = String(active.id);
    let next = modules;
    if (active.data.current?.type === "module") {
      const a = modules.findIndex((m) => M(m.id) === active.id);
      const b = modules.findIndex((m) => M(m.id) === over.id);
      if (a >= 0 && b >= 0 && a !== b) next = arrayMove(modules, a, b);
    } else {
      const mod = containerOf(active.id);
      const overMod = containerOf(over.id);
      if (mod && mod === overMod && String(over.id).startsWith("i|")) {
        const m = modules.find((x) => x.id === mod)!;
        const a = m.items.findIndex((i) => I(i.id) === active.id);
        const b = m.items.findIndex((i) => I(i.id) === over.id);
        if (a !== b && a >= 0 && b >= 0) next = modules.map((x) => (x.id === mod ? { ...x, items: arrayMove(x.items, a, b) } : x));
      }
    }
    commit(next);
    // announce from the order after the move, not the one before it
    setLiveMsg(`Dropped ${name(id)} at ${positionText(next, id)}.`);
  };
  const onDragCancel = () => {
    setActiveId(null);
    if (snapshot.current) onChange(snapshot.current, { save: false });
  };

  const name = (id: UniqueIdentifier) => index.titles.get(String(id)) ?? "item";

  /* ------------------------------------------------------------------ keyboard moves */
  const positionText = (list: Module[], id: string) => {
    if (id.startsWith("m|")) {
      const i = list.findIndex((m) => M(m.id) === id);
      return `position ${i + 1} of ${list.length}`;
    }
    const mi = list.findIndex((m) => m.items.some((it) => I(it.id) === id));
    if (mi < 0) return "";
    const ii = list[mi].items.findIndex((it) => I(it.id) === id);
    return `position ${ii + 1} of ${list[mi].items.length} in module ${mi + 1}, ${list[mi].title}`;
  };
  const kbStart = (id: string) => {
    setKb({ id, snapshot: modules });
    setLiveMsg(`Picked up ${name(id)}, ${positionText(modules, id)}. Use the up and down arrow keys to move, Space or Enter to drop, Escape to cancel.`);
  };
  const kbMove = (id: string, dir: -1 | 1) => {
    let next: Module[] | null = null;
    if (id.startsWith("m|")) {
      const i = modules.findIndex((m) => M(m.id) === id);
      const j = i + dir;
      if (i >= 0 && j >= 0 && j < modules.length) next = arrayMove(modules, i, j);
    } else {
      const itemId = raw(id);
      const mi = modules.findIndex((m) => m.items.some((it) => it.id === itemId));
      if (mi >= 0) {
        const ii = modules[mi].items.findIndex((it) => it.id === itemId);
        const len = modules[mi].items.length;
        if (dir === 1 && ii < len - 1) next = modules.map((m, k) => (k === mi ? { ...m, items: arrayMove(m.items, ii, ii + 1) } : m));
        else if (dir === -1 && ii > 0) next = modules.map((m, k) => (k === mi ? { ...m, items: arrayMove(m.items, ii, ii - 1) } : m));
        else if (dir === 1 && mi < modules.length - 1) next = moveItemTo(itemId, modules[mi + 1].id, 0);
        else if (dir === -1 && mi > 0) next = moveItemTo(itemId, modules[mi - 1].id, modules[mi - 1].items.length);
        // crossing into a collapsed module: open it so the item stays visible and focusable
        const target = next ? next.find((m) => m.items.some((it) => it.id === itemId)) : null;
        if (target && collapsed[target.id]) setCollapsed((c) => ({ ...c, [target.id]: false }));
      }
    }
    if (!next) {
      setLiveMsg(`${name(id)} is already at the ${dir === 1 ? "end" : "start"}, ${positionText(modules, id)}.`);
      return;
    }
    focusAfter({ handle: id });
    onChange(next, { save: false });
    setLiveMsg(`${name(id)} moved to ${positionText(next, id)}.`);
  };
  const kbDrop = (id: string) => {
    setKb(null);
    commit(modules);
    setLiveMsg(`Dropped ${name(id)} at ${positionText(modules, id)}.`);
  };
  const kbCancel = () => {
    if (!kb) return;
    const { id, snapshot: before } = kb;
    setKb(null);
    focusAfter({ handle: id });
    onChange(before, { save: false });
    setLiveMsg(`Cancelled. ${name(id)} went back to ${positionText(before, id)}.`);
  };
  const handleKeyDown = (id: string) => (e: React.KeyboardEvent<HTMLElement>) => {
    const active = kb?.id === id;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (active) kbDrop(id);
      else if (!kb) kbStart(id);
    } else if (active && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      kbMove(id, e.key === "ArrowDown" ? 1 : -1);
    } else if (active && e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      kbCancel();
    } else if (active && e.key === "Tab") {
      kbDrop(id);
    }
  };
  // focus or a click landing anywhere else drops the picked-up item where it is
  const latest = useRef({ kb, kbDrop });
  useLayoutEffect(() => {
    latest.current = { kb, kbDrop };
  });
  useEffect(() => {
    if (!kb) return;
    const onFocus = (e: FocusEvent) => {
      const cur = latest.current.kb;
      const t = e.target as HTMLElement | null;
      if (cur && t?.getAttribute?.("data-dnd-handle") !== cur.id) latest.current.kbDrop(cur.id);
    };
    const onPointer = (e: PointerEvent) => {
      const cur = latest.current.kb;
      const t = e.target as HTMLElement | null;
      if (cur && !t?.closest?.(`[data-dnd-handle="${window.CSS.escape(cur.id)}"]`)) latest.current.kbDrop(cur.id);
    };
    document.addEventListener("focusin", onFocus);
    document.addEventListener("pointerdown", onPointer, true);
    return () => {
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("pointerdown", onPointer, true);
    };
  }, [kb]);
  const kbHandle = (id: string): KbHandle => ({ onKeyDown: handleKeyDown(id), picked: kb?.id === id });
  const where = (id: UniqueIdentifier) => {
    const s = String(id);
    if (s.startsWith("m|")) return `position ${modules.findIndex((m) => M(m.id) === s) + 1} of ${modules.length}`;
    const mod = modules.find((m) => m.id === containerOf(id));
    if (!mod) return "";
    const i = mod.items.findIndex((x) => I(x.id) === s);
    return `${s.startsWith("z|") ? "the end of" : `position ${i + 1} in`} module ${mod.position}, ${mod.title}`;
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${name(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `${name(active.id)} is over ${where(over.id)}.` : `${name(active.id)} is no longer over a drop area.`),
    onDragEnd: ({ active, over }) => (over ? undefined : `Dropped ${name(active.id)}. It went back to where it was.`),
    onDragCancel: ({ active }) => `Cancelled. ${name(active.id)} went back to where it was.`,
  };

  const activeModule = activeId?.startsWith("m|") ? modules.find((m) => M(m.id) === activeId) : null;
  const activeItem = activeId?.startsWith("i|") ? modules.flatMap((m) => m.items).find((i) => I(i.id) === activeId) : null;

  /** a move from a menu: the item may remount in another module, so send focus to its "More actions" button */
  const menuMoveItem = (it: ModuleItem, next: Module[], msg?: string) => {
    const target = next.find((x) => x.items.some((y) => y.id === it.id));
    if (target && collapsed[target.id]) setCollapsed((c) => ({ ...c, [target.id]: false }));
    focusAfter({ menuOf: I(it.id) }, { handle: I(it.id) });
    commit(next, msg);
    setLiveMsg(`${name(I(it.id))} moved to ${positionText(next, I(it.id))}.`);
  };
  const menuMoveModule = (m: Module, next: Module[]) => {
    focusAfter({ menuOf: M(m.id) }, { handle: M(m.id) });
    commit(next);
    setLiveMsg(`${name(M(m.id))} moved to ${positionText(next, M(m.id))}.`);
  };

  /** Reorder mode (touch): one step up or down, crossing into the neighbouring module at the edges. */
  const stepItem = (m: Module, it: ModuleItem, i: number, dir: -1 | 1) => {
    const mi = modules.findIndex((x) => x.id === m.id);
    let next: Module[] | null = null;
    if (dir === -1) next = i > 0 ? modules.map((x) => (x.id === m.id ? { ...x, items: arrayMove(x.items, i, i - 1) } : x)) : mi > 0 ? moveItemTo(it.id, modules[mi - 1].id, modules[mi - 1].items.length) : null;
    else next = i < m.items.length - 1 ? modules.map((x) => (x.id === m.id ? { ...x, items: arrayMove(x.items, i, i + 1) } : x)) : mi < modules.length - 1 ? moveItemTo(it.id, modules[mi + 1].id, 0) : null;
    if (!next) return;
    const target = next.find((x) => x.items.some((y) => y.id === it.id));
    if (target && collapsed[target.id]) setCollapsed((c) => ({ ...c, [target.id]: false }));
    const sel = (d: string) => ({ selector: `[data-step="${window.CSS.escape(`${I(it.id)}:${d}`)}"]:not(:disabled)` });
    focusAfter(sel(dir === -1 ? "up" : "down"), sel(dir === -1 ? "down" : "up"));
    commit(next);
    setLiveMsg(`${name(I(it.id))} moved to ${positionText(next, I(it.id))}.`);
  };
  const stepModule = (mi: number, dir: -1 | 1) => {
    const j = mi + dir;
    if (j < 0 || j >= modules.length) return;
    const m = modules[mi];
    const next = arrayMove(modules, mi, j);
    const sel = (d: string) => ({ selector: `[data-step="${window.CSS.escape(`${M(m.id)}:${d}`)}"]:not(:disabled)` });
    focusAfter(sel(dir === -1 ? "up" : "down"), sel(dir === -1 ? "down" : "up"));
    commit(next);
    setLiveMsg(`${name(M(m.id))} moved to ${positionText(next, M(m.id))}.`);
  };

  const itemMenu = (m: Module, it: ModuleItem, i: number): MenuItem[] => {
    const mi = modules.findIndex((x) => x.id === m.id);
    return [
      { label: "Edit", icon: "edit", onSelect: () => openEdit(m.id, it) },
      { label: "Rename", icon: "pen", onSelect: () => setRenaming(it.id) },
      { divider: true },
      { label: "Insert a test after", icon: "quiz", onSelect: () => openNew("quiz", m.id, i + 1) },
      { label: "Insert a lesson after", icon: "video", onSelect: () => openNew("video", m.id, i + 1) },
      { divider: true },
      { label: "Move up", icon: "arrow-up", disabled: i === 0 && mi === 0, onSelect: () => menuMoveItem(it, i > 0 ? modules.map((x) => (x.id === m.id ? { ...x, items: arrayMove(x.items, i, i - 1) } : x)) : moveItemTo(it.id, modules[mi - 1].id, modules[mi - 1].items.length)) },
      { label: "Move down", icon: "arrow-down", disabled: i === m.items.length - 1 && mi === modules.length - 1, onSelect: () => menuMoveItem(it, i < m.items.length - 1 ? modules.map((x) => (x.id === m.id ? { ...x, items: arrayMove(x.items, i, i + 1) } : x)) : moveItemTo(it.id, modules[mi + 1].id, 0)) },
      ...(mi > 0 ? [{ label: `Move to module ${pad2(mi)}`, icon: "chevron-up" as const, onSelect: () => menuMoveItem(it, moveItemTo(it.id, modules[mi - 1].id, modules[mi - 1].items.length), `Moved to ${modules[mi - 1].title}`) }] : []),
      ...(mi < modules.length - 1 ? [{ label: `Move to module ${pad2(mi + 2)}`, icon: "chevron-down" as const, onSelect: () => menuMoveItem(it, moveItemTo(it.id, modules[mi + 1].id, 0), `Moved to ${modules[mi + 1].title}`) }] : []),
      { divider: true },
      { label: "Delete", icon: "trash", danger: true, onSelect: () => deleteItem(m, it) },
    ];
  };

  const itemCount = modules.reduce((s, m) => s + m.items.length, 0);
  return (
    <div>
      {/* touch screens: drag handles are hidden; reorder with big up/down buttons instead */}
      {modules.length > 0 && (
        <div className={clsx("mb-3 hidden items-center gap-3 coarse:flex", reorder && "rounded-full bg-ink py-1.5 pr-1.5 pl-4 shadow-lift")}>
          <p className={clsx("min-w-0 flex-1 text-[13.5px] leading-snug font-semibold", reorder ? "text-cream" : "text-ink/60")} aria-live="polite">
            {reorder ? "Use the arrows to move lessons and modules." : `Tap a row to edit it · ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
          </p>
          <Button size="sm" variant={reorder ? "sun" : "secondary"} icon={reorder ? "check" : "sort"} aria-pressed={reorder} onClick={() => setReorder((r) => !r)} className="shrink-0">
            {reorder ? "Done" : "Reorder"}
          </Button>
        </div>
      )}
      {modules.length === 0 ? (
        <div className="rounded-card bg-white shadow-soft">
          <EmptyState art="tami" title="No modules yet." body="Modules are the chapters of your course. Start with one; you can rename and reorder later." action={<Button icon="plus" onClick={addModule}>Add a module</Button>} />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collision}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
          accessibility={{
            announcements,
            screenReaderInstructions: { draggable: "To pick up, press Space or Enter. Use the arrow keys to move, Space or Enter to drop, Escape to cancel." },
          }}
        >
          <SortableContext items={modules.map((m) => M(m.id))} strategy={verticalListSortingStrategy}>
            <ol className="flex flex-col gap-4" aria-label="Modules">
              {modules.map((m, mi) => (
                <SortableModule
                  key={m.id}
                  module={m}
                  index={mi}
                  count={modules.length}
                  collapsed={!!collapsed[m.id]}
                  onToggle={() => setCollapsed((c) => ({ ...c, [m.id]: !c[m.id] }))}
                  renaming={renaming === m.id}
                  onRename={(title) => {
                    setRenaming(null);
                    if (title !== null && title !== m.title) patchModule(m.id, { title });
                  }}
                  onStartRename={() => setRenaming(m.id)}
                  menu={[
                    { label: "Rename", icon: "pen", onSelect: () => setRenaming(m.id) },
                    { label: "Add a video lesson", icon: "video", onSelect: () => openNew("video", m.id, m.items.length) },
                    { label: "Add a test", icon: "quiz", onSelect: () => openNew("quiz", m.id, m.items.length) },
                    { label: "Add a resource", icon: "file", onSelect: () => openNew("resource", m.id, m.items.length) },
                    { divider: true },
                    { label: "Move up", icon: "arrow-up", disabled: mi === 0, onSelect: () => menuMoveModule(m, arrayMove(modules, mi, mi - 1)) },
                    { label: "Move down", icon: "arrow-down", disabled: mi === modules.length - 1, onSelect: () => menuMoveModule(m, arrayMove(modules, mi, mi + 1)) },
                    { divider: true },
                    { label: "Delete module", icon: "trash", danger: true, onSelect: () => deleteModule(m) },
                  ]}
                  onAdd={(kind) => openNew(kind, m.id, m.items.length)}
                  kb={kbHandle(M(m.id))}
                  reorder={reorder}
                  onStep={(dir) => stepModule(mi, dir)}
                >
                  <SortableContext items={m.items.map((it) => I(it.id))} strategy={verticalListSortingStrategy}>
                    <ItemsZone moduleId={m.id} empty={m.items.length === 0}>
                      {m.items.map((it, i) => (
                        <li key={it.id} className="list-none">
                          {i > 0 && <InsertSlot onPick={(k) => openNew(k, m.id, i)} label={`Insert between ${itemTitle(m.items[i - 1]) || "item"} and ${itemTitle(it) || "item"}`} />}
                          <SortableItem
                            item={it}
                            index={nthOfType(m.items, i)}
                            isFree={it.type === "video" && it.lesson.isFreePreview}
                            isAutoFree={it.id === freeId}
                            renaming={renaming === it.id}
                            onStartRename={() => setRenaming(it.id)}
                            onRename={(title) => {
                              setRenaming(null);
                              if (title === null || title === itemTitle(it)) return;
                              const next: ModuleItem =
                                it.type === "video" ? { ...it, lesson: { ...it.lesson, title } } : it.type === "quiz" ? { ...it, quiz: { ...it.quiz, title } } : { ...it, resource: { ...it.resource, title } };
                              commit(modules.map((x) => (x.id === m.id ? { ...x, items: x.items.map((y) => (y.id === it.id ? next : y)) } : x)));
                            }}
                            onEdit={() => openEdit(m.id, it)}
                            menu={itemMenu(m, it, i)}
                            kb={kbHandle(I(it.id))}
                            reorder={reorder}
                            canUp={!(i === 0 && mi === 0)}
                            canDown={!(i === m.items.length - 1 && mi === modules.length - 1)}
                            onStep={(dir) => stepItem(m, it, i, dir)}
                          />
                        </li>
                      ))}
                    </ItemsZone>
                  </SortableContext>
                </SortableModule>
              ))}
            </ol>
          </SortableContext>
          {isClient &&
            createPortal(
          <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.32, 0.72, 0, 1)" }} zIndex={260}>
            {activeModule ? (
              <div className="rounded-card bg-white p-4 shadow-lift ring-2 ring-ink">
                <p className="t-micro text-ink/50 uppercase">Module {pad2(activeModule.position)}</p>
                <p className="t-app-h3 mt-1">{activeModule.title}</p>
                <p className="mt-1 text-[13px] font-semibold text-ink/55">{activeModule.items.length} items</p>
              </div>
            ) : activeItem ? (
              <ItemRow item={activeItem} index={overlayNth(modules, activeItem.id)} isFree={activeItem.type === "video" && activeItem.lesson.isFreePreview} isAutoFree={activeItem.id === freeId} overlay />
            ) : null}
          </DragOverlay>,
              document.body,
            )}
        </DndContext>
      )}

      {modules.length > 0 && (
        <button
          type="button"
          onClick={addModule}
          data-add-module=""
          className="tap mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-card border-2 border-dashed border-ink/15 text-[15px] font-bold text-ink/70 transition-colors hf:border-ink/30 hf:bg-white hf:text-ink"
        >
          <Icon name="plus" className="size-5" strokeWidth={2.4} /> Add module
        </button>
      )}

      <div id="DndLiveRegion-keyboard" role="status" aria-live="assertive" aria-atomic="true" className="sr-only">
        {liveMsg}
      </div>

      <ItemEditorDrawer
        key={editor?.key ?? 0}
        open={!!editor}
        item={editor?.item ?? null}
        isNew={!!editor?.isNew}
        isFirstVideo={!!editor && editor.item.type === "video" && (editor.item.id === freeId || (editor.isNew && isFirstVideoSlot(modules, editor.moduleId, editor.index)))}
        onClose={() => setEditor(null)}
        onSave={saveItem}
      />
      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={() => confirm?.run()} title={confirm?.title ?? ""} description={confirm?.description} tone="danger" confirmLabel="Delete" />
    </div>
  );
}

/**
 * 0-based number of the item among the items of the same type before it in its module, so the
 * builder reads "LESSON 02" / "TEST 01" exactly like the player, the curriculum and the Q&A
 * labels (flattenCurriculum numbers per type inside a module).
 */
function nthOfType(items: ModuleItem[], i: number) {
  const type = items[i]?.type;
  return items.slice(0, i).filter((x) => x.type === type).length;
}

/** Same numbering for the drag overlay (looks the item up in its current module). */
function overlayNth(modules: Module[], itemId: string) {
  for (const m of modules) {
    const i = m.items.findIndex((x) => x.id === itemId);
    if (i >= 0) return nthOfType(m.items, i);
  }
  return 0;
}

/** Would a new video at (moduleId, index) become the first video of the course? */
function isFirstVideoSlot(modules: Module[], moduleId: string, index: number) {
  for (const m of modules) {
    const upto = m.id === moduleId ? m.items.slice(0, index) : m.items;
    if (upto.some((i) => i.type === "video")) return false;
    if (m.id === moduleId) return true;
  }
  return true;
}

/* ----------------------------------------------------------------------------- module */
function SortableModule({
  module: m,
  index,
  count,
  collapsed,
  onToggle,
  renaming,
  onRename,
  onStartRename,
  menu,
  onAdd,
  kb,
  reorder,
  onStep,
  children,
}: {
  module: Module;
  index: number;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  renaming: boolean;
  onRename: (t: string | null) => void;
  onStartRename: () => void;
  menu: MenuItem[];
  onAdd: (k: Kind) => void;
  kb: KbHandle;
  reorder?: boolean;
  onStep?: (dir: -1 | 1) => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: M(m.id), data: { type: "module" } });
  const secs = m.items.reduce((s, i) => s + (i.type === "video" ? i.lesson.durationSec : 0), 0);
  const counts = { video: 0, quiz: 0, resource: 0 };
  m.items.forEach((i) => counts[i.type]++);
  return (
    <li
      ref={setNodeRef}
      id={`module-${m.id}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={clsx(
        "relative rounded-card",
        isDragging ? "z-10 bg-sun/30 outline-2 -outline-offset-2 outline-sun outline-dashed" : kb.picked ? "bg-white shadow-lift ring-2 ring-blue" : "bg-white shadow-soft",
      )}
      aria-label={`Module ${index + 1} of ${count}: ${m.title}`}
    >
      <div className={clsx(isDragging && "opacity-0")}>
        <div className="flex items-center gap-2 p-3 coarse:pl-4 md:gap-3 md:p-4" data-focus-row="">
          <button
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
            onKeyDown={kb.onKeyDown}
            data-dnd-handle={M(m.id)}
            aria-pressed={kb.picked}
            data-cursor="grab"
            aria-label={`Drag to reorder module ${m.title}`}
            className={clsx("grid size-9 shrink-0 touch-none place-items-center rounded-full coarse:hidden", kb.picked ? "bg-blue text-white" : "text-ink/45 hf:bg-cream hf:text-ink")}
          >
            <Icon name="drag" className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="t-micro text-ink/50 uppercase">Module {pad2(index + 1)}</p>
            <InlineEdit value={m.title} editing={renaming} onStart={onStartRename} onDone={onRename} label="Module title" className="t-app-h3 text-[17px] md:text-[18px]" />
            <p className="mt-0.5 text-[12.5px] leading-snug font-semibold text-ink/55">
              {m.items.length === 0
                ? "Empty"
                : // each part stays whole and the separator trails it, so a wrapped line never starts with "·"
                  (
                    [
                      counts.video && `${counts.video} ${counts.video === 1 ? "lesson" : "lessons"}`,
                      counts.quiz && `${counts.quiz} ${counts.quiz === 1 ? "test" : "tests"}`,
                      counts.resource && `${counts.resource} ${counts.resource === 1 ? "resource" : "resources"}`,
                      secs > 0 && formatDuration(secs),
                    ].filter(Boolean) as string[]
                  ).map((part, i, all) => (
                    <Fragment key={part}>
                      <span className="whitespace-nowrap">
                        {part}
                        {i < all.length - 1 && " ·"}
                      </span>
                      {i < all.length - 1 && " "}
                    </Fragment>
                  ))}
            </p>
          </div>
          {reorder && onStep ? (
            <StepButtons label={`module ${m.title}`} id={M(m.id)} canUp={index > 0} canDown={index < count - 1} onStep={onStep} />
          ) : (
            <>
              <Button variant="ghost" size="sm" iconOnly icon={collapsed ? "chevron-down" : "chevron-up"} aria-label={collapsed ? `Expand ${m.title}` : `Collapse ${m.title}`} aria-expanded={!collapsed} onClick={onToggle} />
              <DropdownMenu
                label={`Actions for module ${m.title}`}
                trigger={<Icon name="more" className="size-5" />}
                items={menu}
                triggerClassName="grid size-9 place-items-center rounded-full text-ink/70 hf:bg-ink/[0.06] hf:text-ink coarse:size-11"
              />
            </>
          )}
        </div>
        {!collapsed && (
          <div className="px-2.5 pb-3 sm:px-3 md:px-4 md:pb-4">
            {children}
            <div className="mt-3 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
              {(
                [
                  { kind: "video", icon: "video", short: "Lesson", long: "Add lesson" },
                  { kind: "quiz", icon: "quiz", short: "Test", long: "Add test" },
                  { kind: "resource", icon: "file", short: "Resource", long: "Add resource" },
                ] as const
              ).map((b) => (
                <Button key={b.kind} size="sm" variant="secondary" icon={b.icon} onClick={() => onAdd(b.kind)} aria-label={b.long} className="max-sm:px-2">
                  <span className="sm:hidden">{b.short}</span>
                  <span className="max-sm:hidden">{b.long}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

function ItemsZone({ moduleId, empty, children }: { moduleId: string; empty: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: Z(moduleId), data: { type: "zone", moduleId } });
  return (
    <ol ref={setNodeRef} className={clsx("flex min-h-12 flex-col rounded-[20px] transition-colors", empty && "items-center justify-center border-2 border-dashed p-4", empty && (isOver ? "border-sun bg-sun/20" : "border-ink/12 bg-cream/50"))}>
      {empty ? <li className="list-none text-center text-[13.5px] font-semibold text-ink/55">Empty module. Add a lesson below or drag one in here.</li> : children}
    </ol>
  );
}

/* ----------------------------------------------------------------------------- items */
function SortableItem(props: {
  item: ModuleItem;
  index: number;
  isFree: boolean;
  isAutoFree: boolean;
  renaming: boolean;
  onStartRename: () => void;
  onRename: (t: string | null) => void;
  onEdit: () => void;
  menu: MenuItem[];
  kb: KbHandle;
  reorder?: boolean;
  canUp?: boolean;
  canDown?: boolean;
  onStep?: (dir: -1 | 1) => void;
}) {
  const { kb, ...rest } = props;
  const id = I(props.item.id);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, data: { type: "item" } });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className="relative">
      <ItemRow
        {...rest}
        dragging={isDragging}
        picked={kb.picked}
        handle={{ ref: setActivatorNodeRef, props: { ...attributes, ...listeners, onKeyDown: kb.onKeyDown, "data-dnd-handle": id, "aria-pressed": kb.picked } }}
      />
    </div>
  );
}

type KbHandle = { onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void; picked: boolean };

function ItemRow({
  item,
  index,
  isFree,
  isAutoFree,
  renaming,
  onStartRename,
  onRename,
  onEdit,
  menu,
  dragging,
  overlay,
  picked,
  handle,
  reorder,
  canUp,
  canDown,
  onStep,
}: {
  item: ModuleItem;
  /** 0-based number among same-type items before it in the module */
  index: number;
  isFree: boolean;
  isAutoFree: boolean;
  renaming?: boolean;
  onStartRename?: () => void;
  onRename?: (t: string | null) => void;
  onEdit?: () => void;
  menu?: MenuItem[];
  dragging?: boolean;
  overlay?: boolean;
  picked?: boolean;
  handle?: { ref: (el: HTMLElement | null) => void; props: Record<string, unknown> };
  reorder?: boolean;
  canUp?: boolean;
  canDown?: boolean;
  onStep?: (dir: -1 | 1) => void;
}) {
  const ui = TYPE_UI[item.type];
  const title = itemTitle(item);
  let meta: React.ReactNode = null;
  let warn: string | null = null;
  if (item.type === "video") {
    meta = item.lesson.durationSec ? formatDuration(item.lesson.durationSec, "clock") : "No duration";
    if (!item.lesson.videoPath) warn = "No video yet";
  } else if (item.type === "quiz") {
    const p = quizProblems(item.quiz);
    meta = `${item.quiz.questions.length} ${item.quiz.questions.length === 1 ? "question" : "questions"} · pass ${item.quiz.passPercentage}% · ${item.quiz.maxAttempts ? `${item.quiz.maxAttempts} ${item.quiz.maxAttempts === 1 ? "try" : "tries"}` : "unlimited tries"}`;
    if (p.empty) warn = "No questions";
    else if (p.broken) warn = `${p.broken} to fix`;
  } else {
    meta = resourceMeta(item.resource);
  }
  return (
    <div
      data-focus-row=""
      className={clsx(
        "relative flex items-center gap-2 rounded-[18px] py-2 pr-2 pl-1 coarse:min-h-16 coarse:py-2.5 coarse:pr-1.5 coarse:pl-3.5 md:gap-3",
        dragging
          ? "bg-sun/35 outline-2 -outline-offset-2 outline-sun outline-dashed"
          : overlay
            ? "bg-white shadow-lift ring-2 ring-ink"
            : picked
              ? "bg-white shadow-lift ring-2 ring-blue"
              : "bg-cream/70 hf:bg-cream",
      )}
    >
      <div className={clsx("flex min-w-0 flex-1 items-center gap-2 md:gap-3", dragging && "opacity-0")}>
        <button
          ref={handle?.ref}
          type="button"
          {...(handle?.props ?? {})}
          data-cursor="grab"
          aria-label={`Drag to reorder ${itemLabel(item.type).toLowerCase()} ${title || "untitled"}`}
          className={clsx("grid size-8 shrink-0 touch-none place-items-center rounded-full coarse:hidden", picked ? "bg-blue text-white" : "text-ink/40 hf:bg-white hf:text-ink")}
        >
          <Icon name="drag" className="size-[18px]" />
        </button>
        <span className={clsx("grid size-9 shrink-0 place-items-center rounded-full max-sm:hidden", ui.chip)} aria-hidden>
          <Icon name={ui.icon} className="size-4" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="t-micro text-ink/45 uppercase">
            {itemLabel(item.type)} {pad2(index + 1)}
          </p>
          {onRename && onStartRename ? (
            <InlineEdit value={title} editing={!!renaming} onStart={onStartRename} onDone={onRename} label={`${itemLabel(item.type)} title`} className="text-[14.5px] leading-snug font-bold" placeholder="Untitled" />
          ) : (
            <p className="truncate text-[14.5px] font-bold">{title || "Untitled"}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12.5px] font-semibold text-ink/55">
            <span>{meta}</span>
            {isFree && (
              <Badge tone="sun" size="sm">
                <Icon name="play" className="size-2.5" />
                Free preview{isAutoFree ? " · auto" : ""}
              </Badge>
            )}
            {item.type === "quiz" && item.quiz.isGating && (
              <Badge tone="lilac" size="sm">
                <Icon name="lock" className="size-3" />
                Gates next
              </Badge>
            )}
            {warn && (
              <Badge tone="flame" size="sm" dot>
                {warn}
              </Badge>
            )}
          </div>
        </div>
        {onEdit && (
          <Button size="sm" variant="secondary" icon="edit" onClick={onEdit} className="max-sm:hidden coarse:hidden" aria-label={`Edit ${title || "item"}`}>
            Edit
          </Button>
        )}
        {/* touch: the whole row opens the editor (rename lives in the ⋯ menu) */}
        {onEdit && !reorder && !renaming && !overlay && (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${itemLabel(item.type).toLowerCase()} ${title || "untitled"}`}
            className="tap absolute inset-0 z-[1] hidden rounded-[18px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue active:bg-ink/[0.04] coarse:block"
          />
        )}
        {reorder && onStep ? (
          <StepButtons label={`${itemLabel(item.type).toLowerCase()} ${title || "untitled"}`} id={I(item.id)} canUp={!!canUp} canDown={!!canDown} onStep={onStep} />
        ) : (
          menu && (
            <span className="relative z-[2] flex shrink-0">
              <DropdownMenu
                label={`More actions for ${title || "item"}`}
                trigger={<Icon name="more" className="size-5" />}
                items={menu}
                triggerClassName="grid size-9 place-items-center rounded-full text-ink/70 hf:bg-ink/[0.06] hf:text-ink coarse:size-11"
              />
            </span>
          )
        )}
      </div>
    </div>
  );
}

/** Reorder mode (touch): 44px up/down buttons. `data-step` lets focus follow the moved row. */
function StepButtons({ label, id, canUp, canDown, onStep }: { label: string; id: string; canUp: boolean; canDown: boolean; onStep: (dir: -1 | 1) => void }) {
  const cls = "tap relative z-[2] grid size-11 shrink-0 place-items-center rounded-full bg-white text-ink shadow-soft disabled:opacity-35 disabled:shadow-none";
  return (
    <span className="flex shrink-0 items-center gap-2">
      <button type="button" data-step={`${id}:up`} disabled={!canUp} onClick={() => onStep(-1)} aria-label={`Move ${label} up`} className={cls}>
        <Icon name="arrow-up" className="size-5" strokeWidth={2.4} />
      </button>
      <button type="button" data-step={`${id}:down`} disabled={!canDown} onClick={() => onStep(1)} aria-label={`Move ${label} down`} className={cls}>
        <Icon name="arrow-down" className="size-5" strokeWidth={2.4} />
      </button>
    </span>
  );
}

/** Between two items: a "+" that inserts a lesson, test or resource right there. */
function InsertSlot({ onPick, label }: { onPick: (k: Kind) => void; label: string }) {
  return (
    <div className="group/slot relative z-[1] h-2">
      <div className="absolute inset-x-0 -top-1.5 -bottom-1.5 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover/slot:opacity-100 focus-within:opacity-100 [@media(hover:none)]:hidden">
        <span className="absolute inset-x-10 h-0.5 rounded-full bg-blue/50" aria-hidden />
        <DropdownMenu
          label={label}
          align="start"
          width={220}
          trigger={<Icon name="plus" className="size-3.5" strokeWidth={3} />}
          triggerClassName="relative grid size-6 place-items-center rounded-full bg-blue text-white shadow-soft"
          items={[
            { label: "Video lesson here", icon: "video", onSelect: () => onPick("video") },
            { label: "Test here", icon: "quiz", onSelect: () => onPick("quiz") },
            { label: "Resource here", icon: "file", onSelect: () => onPick("resource") },
          ]}
        />
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------- inline rename */
export function InlineEdit({
  value,
  editing,
  onStart,
  onDone,
  label,
  className,
  placeholder = "Untitled",
}: {
  value: string;
  editing: boolean;
  onStart: () => void;
  /** null = cancelled */
  onDone: (v: string | null) => void;
  label: string;
  className?: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  const done = useRef(false);
  if (editing) {
    return (
      <input
        autoFocus
        aria-label={label}
        value={draft}
        maxLength={90}
        onFocus={(e) => {
          done.current = false;
          e.currentTarget.select();
        }}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            done.current = true;
            onDone(draft.trim() || null);
          } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            done.current = true;
            setDraft(value);
            onDone(null);
          }
        }}
        onBlur={() => {
          if (done.current) return;
          onDone(draft.trim() || null);
        }}
        className={clsx("-mx-1.5 w-full rounded-[10px] bg-white px-1.5 py-0.5 ring-2 ring-blue focus:outline-none", className)}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        onStart();
      }}
      title="Click to rename"
      className={clsx("group/ie -mx-1.5 flex max-w-full items-center gap-1.5 rounded-[10px] px-1.5 py-0.5 text-left hf:bg-ink/[0.05] hit", className)}
    >
      <span className={clsx("line-clamp-2 min-w-0 break-words", !value && "text-ink/40")}>{value || placeholder}</span>
      <Icon name="pen" className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover/ie:opacity-50 group-focus-visible/ie:opacity-50" />
      <span className="sr-only">(rename)</span>
    </button>
  );
}

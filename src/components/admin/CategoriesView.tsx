"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  Icon,
  Input,
  Modal,
  PageHeader,
  Select,
  Textarea,
  toast,
  type IconName,
} from "@/components/app";
import { demo, useDb } from "@/lib/demo/store";
import type { Tone } from "@/lib/tone";
import { getCategories, plural, type Category, type Db } from "@/lib/mock";
import {
  EDITORIAL_TONES,
  Idx,
  MonoMeta,
  TonePalette,
  editorialTone,
  toneSurface,
} from "@/components/tutor/editorial";
import { PanelLabel, WideSection } from "./ledgerKit";
import { catIcon } from "./shared";

const ICONS: IconName[] = [
  "code",
  "pen",
  "briefcase",
  "music",
  "chat",
  "camera",
  "book",
  "pot",
  "mic",
  "spark",
  "globe",
  "heart",
  "star",
  "chart",
  "video",
  "sparkles",
  "trend",
  "users",
  "award",
  "layers",
];

/** Screen-reader / hover names for the icon picker. */
const ICON_LABELS: Partial<Record<IconName, string>> = {
  code: "Code brackets",
  pen: "Pen",
  briefcase: "Briefcase",
  music: "Music note",
  chat: "Speech bubble",
  camera: "Camera",
  book: "Book",
  pot: "Cooking pot",
  mic: "Microphone",
  spark: "Spark",
  globe: "Globe",
  heart: "Heart",
  star: "Star",
  chart: "Bar chart",
  video: "Video camera",
  sparkles: "Sparkles",
  trend: "Trend line",
  users: "People",
  award: "Award ribbon",
  layers: "Stacked layers",
};
/** The editorial swatch a stored tone shows as ("Charcoal" for a legacy "blue"). */
const swatchOf = (t: Tone) =>
  EDITORIAL_TONES.find((x) => x.value === editorialTone(t)) ?? EDITORIAL_TONES[4];
const toneLabel = (t: Tone) => swatchOf(t).label;
const iconLabel = (i: IconName) => ICON_LABELS[i] ?? i;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

function courseCounts(db: Db) {
  const out: Record<string, { published: number; total: number }> = {};
  for (const c of db.courses) {
    const x = (out[c.categoryId] ??= { published: 0, total: 0 });
    x.total++;
    if (c.status === "published") x.published++;
  }
  return out;
}

export function CategoriesView() {
  const db = useDb();
  const cats = useMemo(() => getCategories(db), [db]);
  const counts = useMemo(() => courseCounts(db), [db]);
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  /** phones: drag handles are hidden (dnd on touch is fiddly); this mode swaps the
   *  edit/delete buttons for 44px up/down arrows instead */
  const [reorder, setReorder] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const move = (ids: string[], label?: string) => {
    demo.reorderCategories(ids);
    if (label) toast(`${label} moved.`);
  };
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = cats.map((c) => c.id);
    const next = arrayMove(
      ids,
      ids.indexOf(String(active.id)),
      ids.indexOf(String(over.id)),
    );
    move(next, cats.find((c) => c.id === active.id)?.name);
  };
  const nudge = (id: string, dir: -1 | 1) => {
    const ids = cats.map((c) => c.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    move(arrayMove(ids, i, j));
  };

  const nameOf = (id: string | number) =>
    cats.find((c) => c.id === String(id))?.name ?? "Category";
  const posOf = (id: string | number) =>
    cats.findIndex((c) => c.id === String(id)) + 1;
  const totalCourses = db.courses.length;
  const empty = cats.filter((c) => !counts[c.id]?.total).length;

  return (
    <div className="app-enter">
      <PageHeader
        eyebrow="Control room · Catalogue"
        title={
          <>
            Keep the <em>shelves</em> tidy.
          </>
        }
        description="Categories shape the catalogue filters and the course pages. The catalogue follows the order below."
        breadcrumbs={[
          { label: "Control room", href: "/admin" },
          { label: "Categories" },
        ]}
        meta={
          <>
            <Badge tone="neutral">
              {plural(cats.length, "category", "categories")}
            </Badge>
            <Badge tone="neutral">{plural(totalCourses, "course")}</Badge>
            {empty > 0 && (
              <Badge tone="butter" dot>
                {empty} without courses
              </Badge>
            )}
          </>
        }
        actions={
          <Button
            variant="red"
            icon="plus"
            onClick={() => setEditing("new")}
          >
            Add category
          </Button>
        }
      />

      <WideSection
        index="01"
        label="Shelves"
        note={
          <>
            <span className="max-sm:hidden">
              Drag a handle to reorder. Keyboard: focus a handle, press Space,
              then the arrow keys.
            </span>
            <span className="sm:hidden" aria-live="polite">
              {reorder
                ? "Tap the arrows to move a category."
                : "Tap Reorder, then the arrows, to move one."}
            </span>
          </>
        }
        title="In catalogue order"
        action={
          cats.length > 1 && (
            <Button
              variant={reorder ? "primary" : "outline"}
              size="sm"
              icon={reorder ? "check" : "sort"}
              className="sm:hidden"
              aria-pressed={reorder}
              onClick={() => setReorder((r) => !r)}
            >
              {reorder ? "Done" : "Reorder"}
            </Button>
          )
        }
      >
      {cats.length ? (
        <div className="border-t border-fg">
          <div
            aria-hidden
            className="hidden grid-cols-[44px_28px_minmax(0,1fr)_140px_172px] items-center gap-4 border-b border-line py-3 text-[10.5px] font-semibold tracking-[0.14em] text-muted uppercase md:grid"
          >
            <span />
            <span>No.</span>
            <span>Category</span>
            <span className="text-right">Courses</span>
            <span className="text-right">Actions</span>
          </div>
          <DndContext
            id="admin-categories"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
            accessibility={{
              screenReaderInstructions: {
                draggable:
                  "To pick up a category, press Space or Enter. Use the up and down arrow keys to move it, Space or Enter to drop it, or Escape to cancel.",
              },
              announcements: {
                onDragStart: ({ active }) =>
                  `Picked up ${nameOf(active.id)}, position ${posOf(active.id)} of ${cats.length}.`,
                // still over its own slot (right after pick-up): stay quiet so
                // "Picked up …" isn't replaced before it's read
                onDragOver: ({ active, over }) =>
                  over
                    ? over.id === active.id
                      ? undefined
                      : `${nameOf(active.id)} is over ${nameOf(over.id)}, position ${posOf(over.id)} of ${cats.length}.`
                    : `${nameOf(active.id)} is not over a position.`,
                onDragEnd: ({ active, over }) =>
                  over
                    ? `${nameOf(active.id)} moved to position ${posOf(over.id)} of ${cats.length}.`
                    : `${nameOf(active.id)} dropped back in place.`,
                onDragCancel: ({ active }) =>
                  `Cancelled. ${nameOf(active.id)} stays at position ${posOf(active.id)}.`,
              },
            }}
          >
            <SortableContext
              items={cats.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <ol aria-label="Categories in display order">
                {cats.map((c, i) => (
                  <CategoryRow
                    key={c.id}
                    cat={c}
                    index={i}
                    last={i === cats.length - 1}
                    count={counts[c.id] ?? { published: 0, total: 0 }}
                    parent={
                      c.parentId
                        ? cats.find((p) => p.id === c.parentId)?.name
                        : undefined
                    }
                    reorder={reorder}
                    onUp={() => nudge(c.id, -1)}
                    onDown={() => nudge(c.id, 1)}
                    onEdit={() => setEditing(c)}
                    onDelete={() => setDeleting(c)}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        </div>
      ) : (
        <EmptyState
          align="start"
          art="none"
          eyebrow="No shelves"
          title="No categories yet."
          body="Add the first one so learners can browse by topic."
          className="border-t border-fg px-0!"
          action={
            <Button icon="plus" onClick={() => setEditing("new")}>
              Add category
            </Button>
          }
        />
      )}
      </WideSection>

      <CategoryModal
        editing={editing}
        onClose={() => setEditing(null)}
        cats={cats}
      />
      <DeleteCategory
        cat={deleting}
        count={deleting ? (counts[deleting.id]?.total ?? 0) : 0}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

/* ----------------------------------------------------------------------------- row */
function CategoryRow({
  cat,
  index,
  last,
  count,
  parent,
  reorder,
  onUp,
  onDown,
  onEdit,
  onDelete,
}: {
  cat: Category;
  index: number;
  last: boolean;
  count: { published: number; total: number };
  parent?: string;
  reorder: boolean;
  onUp: () => void;
  onDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cat.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx(
        "relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line bg-cream py-4 sm:grid-cols-[44px_28px_minmax(0,1fr)_auto] md:grid-cols-[44px_28px_minmax(0,1fr)_140px_172px] md:gap-4",
        isDragging && "z-10 bg-paper shadow-lift",
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${cat.name} (position ${index + 1})`}
        className="grid size-11 cursor-grab touch-none place-items-center text-muted transition-colors focus-visible:outline-2 focus-visible:outline-red active:cursor-grabbing hf:text-fg max-sm:hidden"
      >
        <Icon name="drag" strokeWidth={1.6} className="size-5" />
      </button>
      <Idx n={index + 1} className="max-sm:hidden" />

      <div className="flex min-w-0 items-center gap-4">
        <span
          className="grid size-11 shrink-0 place-items-center ring-1 ring-line ring-inset"
          aria-hidden
        >
          <Icon name={catIcon(cat.icon)} strokeWidth={1.5} className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span className="font-heading text-[17px] font-semibold tracking-[-0.02em]">{cat.name}</span>
            <span className="font-mono text-[11px] tracking-[0.02em] text-muted">
              /{cat.slug}
            </span>
            <span
              className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.08em] text-muted uppercase"
              title="Card colour"
            >
              <span
                aria-hidden
                className={clsx("size-2.5 ring-1 ring-line ring-inset", swatchOf(cat.tone).swatch)}
              />
              {toneLabel(cat.tone)}
            </span>
            {parent && (
              <Badge tone="neutral" size="sm">
                in {parent}
              </Badge>
            )}
          </p>
          <p className="t-small mt-0.5 line-clamp-1 text-muted max-sm:hidden">
            {cat.description || "No description yet."}
          </p>
          <MonoMeta className="mt-0.5 md:hidden">
            {count.published} live · {count.total} total
          </MonoMeta>
        </div>
      </div>

      <Link
        href={`/courses?category=${cat.slug}`}
        className="hidden text-right underline-offset-[3px] md:block hf:underline"
        title="See it in the catalogue"
      >
        <span className="block font-heading text-[17px] font-semibold tracking-[-0.02em] tabular-nums">
          {count.published} live
        </span>
        <span className="block font-mono text-[10.5px] tracking-[0.04em] text-muted uppercase">
          {count.total} total
        </span>
      </Link>

      <div className="flex items-center justify-end gap-0.5 max-sm:gap-1">
        <span className={reorder ? "contents" : "hidden sm:contents"}>
          <Button
            size="sm"
            variant="ghost"
            iconOnly
            icon="arrow-up"
            aria-label={`Move ${cat.name} up`}
            onClick={onUp}
            disabled={index === 0}
          />
          <Button
            size="sm"
            variant="ghost"
            iconOnly
            icon="arrow-down"
            aria-label={`Move ${cat.name} down`}
            onClick={onDown}
            disabled={last}
          />
        </span>
        <Button
          size="sm"
          variant="ghost"
          iconOnly
          icon="edit"
          aria-label={`Edit ${cat.name}`}
          onClick={onEdit}
          className={reorder ? "max-sm:hidden" : undefined}
        />
        <Button
          size="sm"
          variant="ghost"
          iconOnly
          icon="trash"
          aria-label={`Delete ${cat.name}`}
          onClick={onDelete}
          className={clsx("text-red-deep", reorder && "max-sm:hidden")}
        />
      </div>
    </li>
  );
}

/* ----------------------------------------------------------------------------- modal */
function CategoryModal({
  editing,
  onClose,
  cats,
}: {
  editing: Category | "new" | null;
  onClose: () => void;
  cats: Category[];
}) {
  return editing ? (
    <CategoryForm
      key={editing === "new" ? "new" : editing.id}
      editing={editing}
      onClose={onClose}
      cats={cats}
    />
  ) : null;
}

function CategoryForm({
  editing,
  onClose,
  cats,
}: {
  editing: Category | "new";
  onClose: () => void;
  cats: Category[];
}) {
  const isNew = editing === "new";
  const base = isNew ? null : editing;
  const [name, setName] = useState(base?.name ?? "");
  const [slug, setSlug] = useState(base?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [description, setDescription] = useState(base?.description ?? "");
  // legacy tones show (and save) as their nearest editorial swatch once touched;
  // untouched, the stored value is kept as it is
  const [tone, setTone] = useState<Tone>(base?.tone ?? "sun");
  const [icon, setIcon] = useState<IconName>(catIcon(base?.icon ?? "spark"));
  // a parent that was deleted leaves a dangling id: treat that as top level
  const [parentId, setParentId] = useState(
    base?.parentId && cats.some((c) => c.id === base.parentId)
      ? base.parentId
      : "",
  );
  /** sub-categories of the one being edited: it has to stay top level (one level only) */
  const children = base ? cats.filter((c) => c.parentId === base.id) : [];
  const [errors, setErrors] = useState<{ name?: string; slug?: string }>({});
  const effSlug = slugTouched ? slug : slugify(name);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    const n = name.trim();
    if (!n) errs.name = "Give it a name.";
    else if (n.length > 32)
      errs.name = "Keep it under 32 characters so it fits the filters.";
    else if (
      cats.some(
        (c) => c.id !== base?.id && c.name.toLowerCase() === n.toLowerCase(),
      )
    )
      errs.name = "There's already a category with that name.";
    if (!effSlug) errs.slug = "The slug can't be empty.";
    else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(effSlug))
      errs.slug = "Lowercase letters, numbers and single dashes only.";
    else if (cats.some((c) => c.id !== base?.id && c.slug === effSlug))
      errs.slug = "Another category already uses this slug.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    demo.upsertCategory({
      ...(base ? { id: base.id } : {}),
      name: n,
      slug: effSlug,
      description: description.trim(),
      tone,
      icon,
      position: base?.position ?? cats.length + 1,
      parentId: (!children.length && parentId) || null,
    });
    toast.success(isNew ? `${n} added.` : `${n} saved.`, {
      description: isNew
        ? "It's at the bottom of the list. Drag it wherever it belongs."
        : undefined,
    });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      eyebrow={isNew ? "Category · new" : `Category · /${base?.slug}`}
      title={isNew ? "Add a category" : `Edit ${base?.name}`}
      description="Short, friendly names work best. Learners see these in the catalogue filters."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="category-form" variant="red" icon="check">
            {isNew ? "Add category" : "Save changes"}
          </Button>
        </>
      }
    >
      <form
        id="category-form"
        onSubmit={submit}
        noValidate
        className="grid gap-8 md:grid-cols-[minmax(0,1fr)_220px]"
      >
        <div className="space-y-5">
          <Field label="Name" required error={errors.name}>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                // the auto slug follows the name, so its error is stale too
                setErrors((x) => ({
                  ...x,
                  name: undefined,
                  ...(slugTouched ? {} : { slug: undefined }),
                }));
              }}
              placeholder="e.g. Tech + AI"
              maxLength={40}
              autoFocus
            />
          </Field>
          <Field
            label="Slug"
            required
            error={errors.slug}
            hint={`Used in links: /courses?category=${effSlug || "…"}`}
            labelAction={
              slugTouched && (
                <button
                  type="button"
                  className="underline-offset-[3px] hf:underline"
                  onClick={() => {
                    setSlugTouched(false);
                    setErrors((x) => ({ ...x, slug: undefined }));
                  }}
                >
                  Reset to auto
                </button>
              )
            }
          >
            <Input
              value={effSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase());
                setErrors((x) => ({ ...x, slug: undefined }));
              }}
              prefix="/"
              maxLength={40}
            />
          </Field>
          <Field
            label="Description"
            optional
            hint="One line. Shows on the category page."
          >
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={140}
              showCount
              placeholder="Web, Python, Git and the tools developers use every day."
            />
          </Field>
          <Field
            label="Parent category"
            optional
            hint={
              children.length
                ? `It has ${plural(children.length, "sub-category", "sub-categories")} (${children.map((c) => c.name).join(", ")}), so it stays top level.`
                : "Nest it under another category (one level only)."
            }
          >
            <Select
              value={children.length ? "" : parentId}
              onChange={(e) => setParentId(e.target.value)}
              disabled={children.length > 0}
              options={[
                { value: "", label: "None (top level)" },
                ...cats
                  .filter(
                    (c) =>
                      c.id !== base?.id &&
                      !(c.parentId && cats.some((p) => p.id === c.parentId)),
                  )
                  .map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </Field>

          <TonePalette
            name="category-tone"
            legend="Colour"
            hint="The editorial palette. Older categories show their nearest swatch."
            value={tone}
            onChange={setTone}
          />

          <fieldset>
            <legend className="mb-2 text-[11.5px] leading-[1.4] font-semibold tracking-[0.12em] uppercase">Icon</legend>
            <div className="grid grid-cols-5 border-t border-l border-line sm:grid-cols-10">
              {ICONS.map((ic) => (
                <label
                  key={ic}
                  className="relative cursor-pointer border-r border-b border-line"
                  title={iconLabel(ic)}
                >
                  <input
                    type="radio"
                    name="icon"
                    value={ic}
                    checked={icon === ic}
                    onChange={() => setIcon(ic)}
                    className="peer sr-only"
                  />
                  <span className="sr-only">{iconLabel(ic)}</span>
                  <span
                    aria-hidden
                    className={clsx(
                      "grid aspect-square place-items-center transition-colors peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 peer-focus-visible:outline-red",
                      icon === ic
                        ? "bg-ink text-cream"
                        : "text-fg/75 hf:bg-cream-2 hf:text-fg",
                    )}
                  >
                    <Icon name={ic} strokeWidth={1.5} className="size-5" />
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <aside
          aria-label="Preview"
          className="md:sticky md:top-0 md:self-start"
        >
          <PanelLabel as="p">Preview</PanelLabel>
          <div className={clsx("flex aspect-[4/5] flex-col p-5", toneSurface(tone))}>
            <Icon name={icon} strokeWidth={1.5} className="size-6" />
            <p className="mt-auto font-heading text-[22px] leading-[1.05] font-semibold tracking-[-0.03em] break-words">
              {name.trim() || "Category name"}
            </p>
            <p className="mt-2 text-[13px] leading-snug opacity-80">
              {description.trim() || "A one-line description goes here."}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span
              className={clsx(
                "inline-flex h-8 items-center gap-1.5 px-3 text-[11px] font-semibold tracking-[0.12em] uppercase",
                toneSurface(tone),
              )}
            >
              <Icon name={icon} strokeWidth={1.6} className="size-3.5" />
              {name.trim() || "Filter chip"}
            </span>
          </div>
          <MonoMeta className="mt-2">Swatch: {toneLabel(tone)}</MonoMeta>
        </aside>
      </form>
    </Modal>
  );
}

/* ----------------------------------------------------------------------------- delete */
function DeleteCategory({
  cat,
  count,
  onClose,
}: {
  cat: Category | null;
  count: number;
  onClose: () => void;
}) {
  const db = useDb();
  if (!cat) return null;
  if (count > 0) return <MoveAndDelete cat={cat} onClose={onClose} />;
  const children = db.categories.filter((c) => c.parentId === cat.id);
  const names = children.map((c) => c.name).join(", ");
  return (
    <ConfirmDialog
      open
      onClose={onClose}
      tone="danger"
      title={`Delete ${cat.name}?`}
      description={
        children.length
          ? `It has no courses of its own, but ${names} ${children.length === 1 ? "sits" : "sit"} inside it. Deleting ${cat.name} moves ${children.length === 1 ? "it to the top level, with its courses." : "them to the top level, with their courses."}`
          : "It has no courses, so nothing breaks. It disappears from the catalogue filters straight away."
      }
      confirmLabel={
        children.length ? "Delete and un-nest" : "Delete category"
      }
      onConfirm={() => {
        children.forEach((c) => demo.upsertCategory({ ...c, parentId: null }));
        demo.deleteCategory(cat.id);
        toast({
          title: `${cat.name} deleted.`,
          description: children.length
            ? `${names} ${children.length === 1 ? "is" : "are"} top level now.`
            : undefined,
        });
      }}
    />
  );
}

/** A category with courses can't just vanish: move every course somewhere else, then delete. */
function MoveAndDelete({ cat, onClose }: { cat: Category; onClose: () => void }) {
  const db = useDb();
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const list = db.courses.filter((c) => c.categoryId === cat.id);
  const children = db.categories.filter((c) => c.parentId === cat.id);
  const options = getCategories(db)
    .filter((c) => c.id !== cat.id)
    .map((c) => ({
      value: c.id,
      label: c.parentId
        ? `${getCategories(db).find((p) => p.id === c.parentId)?.name ?? "…"} › ${c.name}`
        : c.name,
    }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const to = db.categories.find((c) => c.id === target);
    if (!to) return setError("Pick where the courses should go.");
    list.forEach((c) => demo.updateCourse(c.id, { categoryId: to.id }));
    children.forEach((c) => demo.upsertCategory({ ...c, parentId: null }));
    demo.deleteCategory(cat.id);
    toast.success(`${cat.name} deleted.`, {
      description: `${plural(list.length, "course")} moved to ${to.name}.${
        children.length
          ? ` ${children.map((c) => c.name).join(", ")} ${children.length === 1 ? "is" : "are"} top level now.`
          : ""
      }`,
    });
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={`${cat.name} still has courses`}
      description={`Move its ${plural(list.length, "course")} to another category, so nobody's course ends up homeless. Then ${cat.name} is deleted.`}
      eyebrow={`Category · /${cat.slug}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="move-delete-form" variant="danger" icon="trash">
            Move and delete
          </Button>
        </>
      }
    >
      <form id="move-delete-form" onSubmit={submit} noValidate className="space-y-4">
        <ul className="divide-y divide-line border-y border-line border-t-fg" aria-label={`Courses in ${cat.name}`}>
          {list.slice(0, 6).map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/courses/${c.id}`}
                className="group flex min-h-11 items-center justify-between gap-3 py-2.5 text-[14px] font-medium transition-colors hf:bg-cream-2/60"
              >
                <span className="truncate">{c.title}</span>
                <Icon name="arrow-right" strokeWidth={1.6} className="size-4 shrink-0 text-muted group-hf:text-fg" />
              </Link>
            </li>
          ))}
        </ul>
        {list.length > 6 && (
          <p className="-mt-2 t-small text-muted">and {list.length - 6} more</p>
        )}
        <Field
          label="Move them to"
          required
          error={error ?? undefined}
          hint={
            children.length
              ? `${children.map((c) => c.name).join(", ")} ${children.length === 1 ? "moves" : "move"} to the top level, with ${children.length === 1 ? "its" : "their"} courses.`
              : "Tutors see the new category on their course straight away."
          }
        >
          <Select
            value={target}
            onChange={(e) => {
              setTarget(e.target.value);
              setError(null);
            }}
            placeholder="Choose a category…"
            options={options}
          />
        </Field>
      </form>
    </Modal>
  );
}

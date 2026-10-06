"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import {
  ApplicationReview,
  Avatar,
  Badge,
  Button,
  Card,
  DataTable,
  Drawer,
  EmptyState,
  Field,
  Icon,
  Modal,
  PageHeader,
  Rating,
  STATUS_META,
  StatusPill,
  Tabs,
  Textarea,
  toast,
} from "@/components/app";
import { demo, useDb } from "@/lib/demo/store";
import {
  formatCompact,
  formatDate,
  getApplicationDetails,
  getCategory,
  getTutorApplications,
  getTutors,
  getUser,
  plural,
  timeAgo,
  type ApplicationStatus,
  type Tutor,
  type TutorApplication,
} from "@/lib/mock";
import { toneBg, toneText } from "@/lib/landing-data";
import {
  COMPACT_BOX,
  COMPACT_TABLE,
  CompactFacts,
  MetaRow,
  PersonCell,
  PhoneRow,
  SectionTitle,
  catIcon,
  fitColumns,
  pickSort,
  useAdminId,
  useBoxWidth,
  smartDate,
  splitPlan,
  type FitColumn,
} from "./shared";

type Tab = ApplicationStatus | "all";
const TABS: Tab[] = [
  "pending",
  "changes_requested",
  "approved",
  "rejected",
  "all",
];
type Decision = Exclude<ApplicationStatus, "pending">;

export function TutorsView() {
  const db = useDb();
  const sp = useSearchParams();
  const router = useRouter();
  const raw = sp.get("status") ?? "pending";
  const tab: Tab = (TABS as string[]).includes(raw) ? (raw as Tab) : "pending";
  const [openId, setOpenId] = useState<string | null>(sp.get("app"));
  const [decision, setDecision] = useState<{
    app: TutorApplication;
    kind: Decision;
  } | null>(null);

  const all = useMemo(() => getTutorApplications("all", db), [db]);
  const counts = useMemo(() => {
    const c: Record<Tab, number> = {
      pending: 0,
      changes_requested: 0,
      approved: 0,
      rejected: 0,
      all: all.length,
    };
    for (const a of all) c[a.status]++;
    return c;
  }, [all]);
  const list = useMemo(() => {
    const l = tab === "all" ? all : all.filter((a) => a.status === tab);
    // pending: oldest first (fair queue); decided: newest decision first
    return tab === "pending"
      ? [...l].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
      : [...l].sort((a, b) =>
          (b.decidedAt ?? b.submittedAt).localeCompare(
            a.decidedAt ?? a.submittedAt,
          ),
        );
  }, [all, tab]);
  // most learners first, which is also what the wide table sorts to
  const tutors = useMemo(
    () => [...getTutors(db)].sort((a, b) => b.learners - a.learners),
    [db],
  );
  const [boxRef, boxW] = useBoxWidth();
  const compact = boxW != null && boxW < COMPACT_BOX;
  const liveCount = (t: Tutor) =>
    db.courses.filter((c) => c.tutorId === t.id && c.status === "published")
      .length;
  const searchOf = (t: Tutor) =>
    `${t.name} ${t.email} ${t.headline} ${t.expertise.join(" ")}`;
  const tutorColumns: FitColumn<Tutor>[] = compact
    ? [
        {
          key: "name",
          header: "Tutor",
          cell: (t) => (
            <span className="block min-w-0">
              <PersonCell user={t} href={`/admin/users/${t.id}`} sub={t.headline} />
              <CompactFacts>
                <span>{plural(liveCount(t), "live course")}</span>
                <span>{formatCompact(t.learners)} learners</span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="star" className="size-3.5 text-[#b07a00]" />
                  {t.rating.toFixed(1)}
                </span>
              </CompactFacts>
            </span>
          ),
          sortValue: (t) => t.name,
          searchValue: searchOf,
        },
      ]
    : [
        {
          key: "name",
          header: "Tutor",
          cell: (t) => (
            <span className="block max-w-[320px] min-w-[200px]">
              <PersonCell user={t} href={`/admin/users/${t.id}`} sub={t.headline} />
            </span>
          ),
          sortValue: (t) => t.name,
          searchValue: searchOf,
        },
        {
          key: "courses",
          header: "Courses",
          align: "right",
          cell: liveCount,
          sortValue: liveCount,
        },
        {
          key: "learners",
          header: "Learners",
          align: "right",
          cell: (t) => formatCompact(t.learners),
          sortValue: (t) => t.learners,
        },
        {
          key: "rating",
          header: "Rating",
          minBox: 720,
          cell: (t) => (
            <Rating value={t.rating} size="sm" count={t.reviewCount} />
          ),
          sortValue: (t) => t.rating,
        },
        {
          key: "share",
          header: "Share",
          minBox: 1080,
          align: "right",
          cell: (t) => `${Math.round(t.revenueShare * 100)}%`,
          sortValue: (t) => t.revenueShare,
        },
        {
          key: "active",
          header: "Last active",
          minBox: 900,
          cell: (t) => (
            <span className="whitespace-nowrap">{timeAgo(t.lastActiveAt)}</span>
          ),
          sortValue: (t) => t.lastActiveAt,
        },
      ];
  const tutorCols = fitColumns(tutorColumns, boxW);
  const tutorSort = pickSort(tutorCols, { key: "learners", dir: "desc" });
  const open = openId ? (all.find((a) => a.id === openId) ?? null) : null;

  const closeDrawer = () => {
    setOpenId(null);
    if (sp.get("app"))
      router.replace(
        tab === "pending" ? "/admin/tutors" : `/admin/tutors?status=${tab}`,
        { scroll: false },
      );
  };
  const href = (t: Tab) =>
    t === "pending" ? "/admin/tutors" : `/admin/tutors?status=${t}`;

  return (
    <div className="app-enter">
      <PageHeader
        eyebrow="Tutor applications"
        eyebrowTone="purple"
        title="Who wants to teach?"
        description="Read the idea, check the sample, and help good teachers find their people."
        breadcrumbs={[
          { label: "Control room", href: "/admin" },
          { label: "Tutor applications" },
        ]}
        meta={
          counts.pending > 0 ? (
            <Badge tone="sun" dot>
              {plural(counts.pending, "application")} waiting
            </Badge>
          ) : (
            <Badge tone="mint" dot>
              Queue clear
            </Badge>
          )
        }
      />

      <Tabs
        label="Application status"
        value={tab}
        className="mb-5"
        items={[
          {
            id: "pending",
            label: "Pending",
            count: counts.pending,
            href: href("pending"),
          },
          {
            id: "changes_requested",
            label: "Changes requested",
            count: counts.changes_requested,
            href: href("changes_requested"),
          },
          {
            id: "approved",
            label: "Approved",
            count: counts.approved,
            href: href("approved"),
          },
          {
            id: "rejected",
            label: "Rejected",
            count: counts.rejected,
            href: href("rejected"),
          },
          { id: "all", label: "All", count: counts.all, href: href("all") },
        ]}
      />

      {list.length ? (
        // two columns only when the content box itself is wide (≥ 768px), so the
        // sidebar at 1024 doesn't squeeze each card to ~340px
        <div className="@container">
        <ul className="grid grid-cols-1 gap-4 @3xl:grid-cols-2 md:gap-6">
          {list.map((a, i) => (
            <li
              key={a.id}
              className="app-enter min-w-0"
              style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
            >
              <ApplicationCard
                app={a}
                showStatus={tab === "all"}
                onOpen={() => setOpenId(a.id)}
                onDecide={(kind) => setDecision({ app: a, kind })}
              />
            </li>
          ))}
        </ul>
        </div>
      ) : (
        <Card>
          <EmptyState
            art="buddies"
            tone="mint"
            title={
              tab === "pending"
                ? "Nobody waiting. Nice."
                : "Nothing in this pile."
            }
            body={
              tab === "pending"
                ? "New applications from the Become a tutor page land here first."
                : "Applications move here once they get an answer."
            }
            action={
              <Button variant="secondary" href="/become-tutor" icon="external">
                See the application form
              </Button>
            }
          />
        </Card>
      )}

      <section className="mt-10 md:mt-12" aria-labelledby="tutors-title">
        <SectionTitle
          id="tutors-title"
          title="Teaching on Tamada now"
          description={`${plural(tutors.length, "active tutor")}, sorted by learners.`}
        />
        <div ref={boxRef}>
          <DataTable<Tutor>
            caption="Active tutors"
            rows={tutors}
            getRowId={(t) => t.id}
            search={{ placeholder: "Search tutors" }}
            pageSize={8}
            rowHref={(t) => `/admin/users/${t.id}`}
            mobileRow={(t) => (
              <PhoneRow
                leading={<Avatar name={t.name} src={t.avatar} tone={t.tone} size="md" decorative />}
                title={t.name}
                lines={[
                  t.headline,
                  [
                    plural(liveCount(t), "live course"),
                    <>
                      <Icon name="star" className="size-3.5 text-[#b07a00]" />
                      {t.rating.toFixed(1)}
                    </>,
                  ],
                ]}
                trailing={formatCompact(t.learners)}
                badge={<span className="text-[12px] font-semibold text-ink/55">learners</span>}
              />
            )}
            dense={boxW != null && boxW < 1000}
            minWidth={compact ? 0 : 560}
            className={compact ? COMPACT_TABLE : undefined}
            key={tutorSort.sortKey}
            columns={tutorCols}
            initialSort={tutorSort.initialSort}
            empty={{
              title: "No tutors yet.",
              body: "Approve an application to welcome the first one.",
            }}
          />
        </div>
      </section>

      <ApplicationDrawer
        app={open}
        onClose={closeDrawer}
        onDecide={(kind) => open && setDecision({ app: open, kind })}
      />
      <DecisionModal
        decision={decision}
        onClose={() => setDecision(null)}
        onDone={closeDrawer}
      />
    </div>
  );
}

/* ----------------------------------------------------------------------------- card */
/** The date that matters for triage: when it came in, or when it was decided. */
function whenLine(app: TutorApplication) {
  if (app.decidedAt) {
    if (app.status === "approved") return `Approved ${smartDate(app.decidedAt)}`;
    if (app.status === "rejected") return `Rejected ${smartDate(app.decidedAt)}`;
    if (app.status === "changes_requested")
      return `Changes asked ${timeAgo(app.decidedAt)}`;
  }
  return `sent ${timeAgo(app.submittedAt)}`;
}

function ApplicationCard({
  app,
  showStatus,
  onOpen,
  onDecide,
}: {
  app: TutorApplication;
  /** single-status tabs already say the status; only "All" needs the pill */
  showStatus?: boolean;
  onOpen: () => void;
  onDecide: (k: Decision) => void;
}) {
  const db = useDb();
  const cat = getCategory(app.categoryId, db);
  const user = getUser(app.userId, db);
  const isNew = app.id.startsWith("app_d");
  const open = app.status === "pending" || app.status === "changes_requested";
  const plan = splitPlan(app);
  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-start gap-3">
        <Avatar
          name={app.name}
          src={user?.avatar}
          tone={user?.tone ?? "sun"}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="min-w-0 t-app-h3 break-words">{app.name}</h3>
            {isNew && (
              <Badge tone="hotpink" size="sm">
                New
              </Badge>
            )}
            {showStatus && <StatusPill status={app.status} size="sm" />}
          </div>
          {/* wraps as a unit; the dot sits in the gap and is clipped when the
              date drops to its own line, so no line starts or ends with "·" */}
          <p className="flex flex-wrap gap-x-3 overflow-hidden text-[13px] font-medium text-ink/60">
            <span>{app.city}</span>
            <span className="relative whitespace-nowrap before:absolute before:-left-2 before:content-['·']">
              {whenLine(app)}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-tag bg-cream p-4">
        <div className="flex flex-wrap items-center gap-2">
          {cat && (
            <span
              className={clsx(
                "inline-flex h-6 items-center gap-1 rounded-full px-2 text-[12px] font-bold",
                toneBg[cat.tone],
                toneText[cat.tone],
              )}
            >
              <Icon name={catIcon(cat.icon)} className="size-3.5" />
              {cat.name}
            </span>
          )}
          <span className="text-[13px] font-semibold text-ink/60">
            {app.subject}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-[16px] leading-snug font-bold">
          {plan.title}
        </p>
        {plan.outline.length > 0 && (
          <p className="mt-1 text-[13px] font-semibold text-ink/55">
            {plural(plan.outline.length, "part")} in the outline
          </p>
        )}
        <p className="mt-1.5 line-clamp-2 t-small text-ink/70">“{app.why}”</p>
      </div>

      {app.decisionNote && !open && (
        <p className="mt-3 t-small text-ink/65">Note: {app.decisionNote}</p>
      )}
      {app.status === "changes_requested" && app.decisionNote && (
        <p className="mt-3 rounded-tag bg-[#dfe8ff] p-3 t-small text-blue-deep">
          You asked: {app.decisionNote}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        <Button
          size="sm"
          variant={open ? "primary" : "secondary"}
          onClick={onOpen}
        >
          {open ? "Review application" : "View application"}
        </Button>
        {app.status === "pending" && (
          <Button
            size="sm"
            variant="ghost"
            icon="check"
            onClick={() => onDecide("approved")}
          >
            Approve
          </Button>
        )}
      </div>
    </Card>
  );
}

/* ----------------------------------------------------------------------------- drawer */
function ApplicationDrawer({
  app,
  onClose,
  onDecide,
}: {
  app: TutorApplication | null;
  onClose: () => void;
  onDecide: (k: Decision) => void;
}) {
  const db = useDb();
  const cat = app ? getCategory(app.categoryId, db) : null;
  const user = app ? getUser(app.userId, db) : null;
  const decidedBy = app?.decidedBy
    ? (getUser(app.decidedBy, db)?.name ?? "An admin")
    : null;
  const open =
    app && (app.status === "pending" || app.status === "changes_requested");
  const plan = app ? splitPlan(app) : null;
  const sections: { title: string; body: React.ReactNode }[] = app && plan
    ? [
        { title: "What they’d teach", body: app.subject },
        {
          title: "Their first course",
          body: (
            <>
              <span className="block font-bold">{plan.title}</span>
              {plan.outline.length > 0 && (
                <span className="mt-3 block rounded-tag bg-cream p-3">
                  <span className="block t-micro text-ink/55 uppercase">
                    Rough outline
                  </span>
                  <ol className="mt-1.5 list-decimal space-y-0.5 pl-5 text-[14px] leading-relaxed whitespace-normal marker:font-bold marker:text-ink/45">
                    {plan.outline.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </span>
              )}
            </>
          ),
        },
        { title: "Teaching experience", body: getApplicationDetails(app).experience },
        { title: "Why Tamada, why now", body: app.why },
      ]
    : [];
  return (
    <Drawer
      open={!!app}
      onClose={onClose}
      width={520}
      title={app ? app.name : "Application"}
      description={app ? `${app.email} · ${app.city}` : undefined}
      footer={
        app &&
        (open ? (
          <>
            {/* phones: Reject + Request changes share a row, Approve fills the
                bottom row (thumb zone) */}
            <Button
              variant="ghost"
              size="sm"
              className="max-sm:h-12"
              onClick={() => onDecide("rejected")}
            >
              Reject
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon="edit"
              className="max-sm:h-12"
              onClick={() => onDecide("changes_requested")}
            >
              Request changes
            </Button>
            <Button
              variant="success"
              size="sm"
              icon="check"
              className="max-sm:h-12 max-sm:basis-full"
              onClick={() => onDecide("approved")}
            >
              Approve tutor
            </Button>
          </>
        ) : (
          <Button variant="secondary" size="sm" className="max-sm:h-12" onClick={onClose}>
            Close
          </Button>
        ))
      }
    >
      {app && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={app.status} />
            {cat && <Badge tone="neutral">{cat.name}</Badge>}
          </div>
          <MetaRow
            items={[
              {
                icon: "calendar",
                label: `Applied ${formatDate(app.submittedAt, "datetime")}`,
              },
              ...(app.status === "approved" && app.decidedAt
                ? [
                    {
                      icon: "award" as const,
                      label: `Tutor since ${smartDate(app.decidedAt)}`,
                    },
                    ...(user
                      ? [
                          {
                            icon: "user" as const,
                            label: `On Tamada since ${smartDate(user.joinedAt)}`,
                          },
                        ]
                      : []),
                  ]
                : [
                    {
                      icon: "user" as const,
                      label: user
                        ? `${user.role === "student" ? "Learner" : STATUS_META[user.role].label} since ${smartDate(user.joinedAt)}`
                        : "No account",
                    },
                  ]),
            ]}
          />
          {sections.map((s) => (
            <Fragment key={s.title}>
              <section>
                <h3 className="mb-1.5 t-micro text-ink/55 uppercase">
                  {s.title}
                </h3>
                <div className="text-[15px] leading-relaxed whitespace-pre-line">
                  {s.body}
                </div>
              </section>
              {s.title === "Teaching experience" && <ApplicationReview app={app} />}
            </Fragment>
          ))}
          <section className="rounded-card bg-butter p-4">
            <h3 className="t-app-h3">Sample and intro video</h3>
            <p className="mt-1 t-small text-ink/70">
              Watch at least two minutes. Are they clear, warm and easy to
              follow?
            </p>
            <a
              href={app.sampleUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-3 flex items-center gap-3 rounded-tag bg-white p-3 text-[14px] font-bold shadow-soft transition-colors hf:bg-cream"
            >
              <span
                className="grid size-9 shrink-0 place-items-center rounded-full bg-flame text-white"
                aria-hidden
              >
                <Icon name="play" className="size-4" />
              </span>
              <span className="min-w-0 flex-1 truncate">
                {app.sampleUrl.replace(/^https?:\/\//, "")}
              </span>
              <Icon name="external" className="size-4 shrink-0 text-ink/45" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </section>
          {app.decisionNote && (
            <section className="rounded-card bg-cream p-4">
              <h3 className="t-micro text-ink/55 uppercase">Decision note</h3>
              <p className="mt-1.5 text-[15px]">“{app.decisionNote}”</p>
              {decidedBy && app.decidedAt && (
                <p className="mt-2 text-[13px] font-semibold text-ink/55">
                  {decidedBy} · {formatDate(app.decidedAt)}
                </p>
              )}
            </section>
          )}
          {user && (
            <Button
              size="sm"
              variant="ghost"
              href={`/admin/users/${user.id}`}
              icon="user"
            >
              Open their account
            </Button>
          )}
        </div>
      )}
    </Drawer>
  );
}

/* ----------------------------------------------------------------------------- decision */
const DECISION_COPY: Record<
  Decision,
  {
    title: string;
    cta: string;
    hint: string;
    placeholder: string;
    tone: "success" | "primary" | "danger";
    required: boolean;
  }
> = {
  approved: {
    title: "Approve this tutor?",
    cta: "Approve tutor",
    hint: "They become a tutor straight away and get a public profile. Your note goes in their welcome email.",
    placeholder: "Lovely sample, clear plan. Welcome aboard!",
    tone: "success",
    required: false,
  },
  changes_requested: {
    title: "Request changes",
    cta: "Send back",
    hint: "Tell them what would make the application stronger.",
    placeholder:
      "Love the idea! Could you share a 3-minute sample lesson so we can see your teaching style?",
    tone: "primary",
    required: true,
  },
  rejected: {
    title: "Reject this application?",
    cta: "Reject",
    hint: "Be kind and specific. They can apply again later.",
    placeholder: "Thanks for applying. We don't host … right now because …",
    tone: "danger",
    required: true,
  },
};

function DecisionModal({
  decision,
  onClose,
  onDone,
}: {
  decision: { app: TutorApplication; kind: Decision } | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const adminId = useAdminId();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const copy = decision ? DECISION_COPY[decision.kind] : null;
  const close = () => {
    setNote("");
    setError(null);
    onClose();
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decision || !copy) return;
    if (copy.required && note.trim().length < 10)
      return setError(
        "Write at least a sentence so they know what to do next.",
      );
    demo.decideTutorApplication(decision.app.id, decision.kind, note, adminId);
    const first = decision.app.name.split(" ")[0];
    if (decision.kind === "approved")
      toast.success(`${first} is now a tutor.`, {
        description:
          "Their studio is open and the welcome email is on its way (demo).",
      });
    else if (decision.kind === "changes_requested")
      toast.info(`Sent back to ${first}.`, {
        description: "The application moves to “Changes requested”.",
      });
    else toast(`${first}'s application was rejected.`);
    close();
    onDone();
  };
  return (
    <Modal
      open={!!decision}
      onClose={close}
      title={copy?.title ?? ""}
      description={
        decision
          ? `${decision.app.name} · ${splitPlan(decision.app).title}`
          : undefined
      }
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="decision-form"
            variant={
              copy?.tone === "success"
                ? "success"
                : copy?.tone === "danger"
                  ? "danger"
                  : "primary"
            }
          >
            {copy?.cta}
          </Button>
        </>
      }
    >
      {copy && (
        <form id="decision-form" onSubmit={submit} noValidate>
          <Field
            label={copy.required ? "Note to the applicant" : "Welcome note"}
            required={copy.required}
            optional={!copy.required}
            hint={copy.hint}
            error={error ?? undefined}
          >
            <Textarea
              rows={4}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setError(null);
              }}
              placeholder={copy.placeholder}
              maxLength={500}
              showCount
            />
          </Field>
        </form>
      )}
    </Modal>
  );
}

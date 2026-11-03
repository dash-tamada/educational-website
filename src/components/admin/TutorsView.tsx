"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ApplicationReview,
  Avatar,
  Badge,
  Button,
  DataTable,
  Drawer,
  EmptyState,
  Field,
  Icon,
  Modal,
  PageHeader,
  Rating,
  Section,
  STATUS_META,
  StatusPill,
  Tabs,
  Textarea,
  toast,
} from "@/components/app";
import { Idx, MonoMeta, RuleNote, RuledList } from "@/components/tutor/editorial";
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
import {
  COMPACT_BOX,
  COMPACT_TABLE,
  CompactFacts,
  MetaRow,
  PersonCell,
  PhoneRow,
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
                  <Icon name="star" className="size-3.5" strokeWidth={1.6} />
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
          cell: (t) => <span className="font-mono text-[13px] tabular-nums">{liveCount(t)}</span>,
          sortValue: liveCount,
        },
        {
          key: "learners",
          header: "Learners",
          align: "right",
          cell: (t) => <span className="font-mono text-[13px] tabular-nums">{formatCompact(t.learners)}</span>,
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
          cell: (t) => <span className="font-mono text-[13px] tabular-nums">{Math.round(t.revenueShare * 100)}%</span>,
          sortValue: (t) => t.revenueShare,
        },
        {
          key: "active",
          header: "Last active",
          minBox: 900,
          cell: (t) => (
            <span className="whitespace-nowrap text-muted">{timeAgo(t.lastActiveAt)}</span>
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

  const tabLabel: Record<Tab, string> = {
    pending: "waiting",
    changes_requested: "waiting on the applicant",
    approved: "approved",
    rejected: "rejected",
    all: "in total",
  };

  return (
    <div className="app-enter">
      <PageHeader
        eyebrow="Control room · Tutors"
        title={
          <>
            Who wants to <em>teach</em>?
          </>
        }
        description="Read the idea, check the sample, and help good teachers find their people."
        breadcrumbs={[
          { label: "Control room", href: "/admin" },
          { label: "Tutor applications" },
        ]}
        rule={false}
        meta={
          <MonoMeta as="span">
            {counts.pending > 0
              ? `${plural(counts.pending, "application")} waiting`
              : "Queue clear"}{" "}
            · {plural(tutors.length, "active tutor")}
          </MonoMeta>
        }
      />

      <Tabs
        label="Application status"
        value={tab}
        className="mb-10 md:mb-14"
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

      <div className="space-y-14 md:space-y-20">
        <Section
          index="01"
          label="Applications"
          note={
            tab === "pending"
              ? "Oldest first: the fairest queue. Open one to read the plan and watch the sample."
              : "Newest decision first."
          }
          title={`${plural(list.length, "application")} ${tabLabel[tab]}.`}
        >
          {list.length ? (
            <RuledList label="Applications">
              {list.map((a, i) => (
                <ApplicationRow
                  key={a.id}
                  index={i + 1}
                  app={a}
                  showStatus={tab === "all"}
                  onOpen={() => setOpenId(a.id)}
                  onDecide={(kind) => setDecision({ app: a, kind })}
                />
              ))}
            </RuledList>
          ) : (
            <EmptyState
              art="none"
              align="start"
              eyebrow={tab === "pending" ? "Queue clear" : "Nothing here"}
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
                <Button variant="outline" href="/become-tutor" icon="external">
                  See the application form
                </Button>
              }
              className="border-t border-fg !px-0"
              compact
            />
          )}
        </Section>

        <Section
          index="02"
          label="Teaching now"
          id="tutors-title"
          note={`${plural(tutors.length, "active tutor")}, sorted by learners.`}
          title="On Tamada today."
        >
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
                        <Icon name="star" className="size-3.5" strokeWidth={1.6} />
                        {t.rating.toFixed(1)}
                      </>,
                    ],
                  ]}
                  trailing={formatCompact(t.learners)}
                  badge={<MonoMeta as="span">learners</MonoMeta>}
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
        </Section>
      </div>

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

function ApplicationRow({
  app,
  index,
  showStatus,
  onOpen,
  onDecide,
}: {
  app: TutorApplication;
  index: number;
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
    <li className="grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-4 py-6 md:grid-cols-[auto_minmax(0,13rem)_minmax(0,1fr)] md:py-7 xl:grid-cols-[auto_minmax(0,14rem)_minmax(0,1fr)_auto]">
      <Idx n={index} className="mt-1.5 max-md:hidden" />
      <div className="flex min-w-0 items-start gap-3">
        <Avatar
          name={app.name}
          src={user?.avatar}
          tone={user?.tone ?? "sun"}
          size="md"
          decorative
        />
        <div className="min-w-0 flex-1">
          <h3 className="t-app-h3 break-words">{app.name}</h3>
          {/* wraps as a unit; the dot sits in the gap and is clipped when the
              date drops to its own line, so no line starts or ends with "·" */}
          <p className="mt-0.5 flex flex-wrap gap-x-3 overflow-hidden text-[13px] text-muted">
            <span>{app.city}</span>
            <span className="relative whitespace-nowrap before:absolute before:-left-2 before:content-['·']">
              {whenLine(app)}
            </span>
          </p>
          {(isNew || showStatus) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {isNew && (
                <Badge tone="red" size="sm">
                  New
                </Badge>
              )}
              {showStatus && <StatusPill status={app.status} size="sm" />}
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0">
        <MonoMeta>
          {[cat?.name, app.subject].filter(Boolean).join(" · ")}
        </MonoMeta>
        <p className="mt-1.5 line-clamp-2 font-heading text-[18px] leading-[1.18] font-semibold tracking-[-0.025em]">
          {plan.title}
        </p>
        <p className="mt-2 line-clamp-2 t-small text-muted">“{app.why}”</p>
        {plan.outline.length > 0 && (
          <MonoMeta className="mt-2">
            {plural(plan.outline.length, "part")} in the outline
          </MonoMeta>
        )}
        {app.status === "changes_requested" && app.decisionNote && (
          <RuleNote tone="quiet" className="mt-3" label="You asked">
            {app.decisionNote}
          </RuleNote>
        )}
        {app.decisionNote && !open && (
          <p className="mt-3 t-small text-muted">
            <span className="font-medium text-fg">Note:</span> {app.decisionNote}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-start gap-2 md:col-start-3 xl:col-start-auto xl:flex-col xl:items-stretch">
        <Button
          size="sm"
          variant={open ? "primary" : "outline"}
          iconRight="arrow-right"
          onClick={onOpen}
        >
          {open ? "Review" : "View"}
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
    </li>
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
              <span className="block font-heading text-[19px] leading-[1.15] font-semibold tracking-[-0.025em]">
                {plan.title}
              </span>
              {plan.outline.length > 0 && (
                <span className="mt-4 block">
                  <span className="block font-mono text-[10.5px] tracking-[0.1em] text-muted uppercase">
                    Rough outline
                  </span>
                  <ol className="mt-2 border-t border-line whitespace-normal">
                    {plan.outline.map((step, i) => (
                      <li
                        key={i}
                        className="flex gap-3 border-b border-line py-2 text-[14px] leading-snug"
                      >
                        <Idx n={i + 1} className="mt-[3px]" />
                        <span className="min-w-0">{step}</span>
                      </li>
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
      width={540}
      eyebrow={
        app
          ? `Tutor application · ${STATUS_META[app.status]?.label ?? app.status}`
          : undefined
      }
      title={app ? app.name : "Application"}
      description={app ? `${app.email} · ${app.city}` : undefined}
      footer={
        app &&
        (open ? (
          <>
            {/* phones: Reject + Request changes share a row, Approve fills the
                bottom row (thumb zone) */}
            <Button
              variant="danger"
              size="sm"
              className="max-sm:h-12 sm:mr-auto"
              onClick={() => onDecide("rejected")}
            >
              Reject
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon="edit"
              className="max-sm:h-12"
              onClick={() => onDecide("changes_requested")}
            >
              Request changes
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon="check"
              className="max-sm:h-12 max-sm:basis-full"
              onClick={() => onDecide("approved")}
            >
              Approve tutor
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" className="max-sm:h-12" onClick={onClose}>
            Close
          </Button>
        ))
      }
    >
      {app && (
        <div className="space-y-7">
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
                <h3 className="mb-2.5 border-b border-fg pb-2 text-[11px] font-semibold tracking-[0.16em] uppercase">
                  {s.title}
                </h3>
                <div className="text-[15px] leading-relaxed whitespace-pre-line">
                  {s.body}
                </div>
              </section>
              {s.title === "Teaching experience" && <ApplicationReview app={app} />}
            </Fragment>
          ))}
          <section>
            <h3 className="mb-2.5 border-b border-fg pb-2 text-[11px] font-semibold tracking-[0.16em] uppercase">
              Sample and intro video
            </h3>
            <p className="t-small text-muted">
              Watch at least two minutes. Are they clear, warm and easy to
              follow?
            </p>
            <a
              href={app.sampleUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="group mt-3 flex items-center gap-3 bg-ink px-4 py-3.5 text-[14px] font-medium text-cream transition-colors hf:bg-graphite focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red"
            >
              <Icon name="play" strokeWidth={1.6} className="size-4 shrink-0 text-red-lite" />
              <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] tracking-[0.02em]">
                {app.sampleUrl.replace(/^https?:\/\//, "")}
              </span>
              <Icon name="external" strokeWidth={1.6} className="size-4 shrink-0 opacity-60" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </section>
          {app.decisionNote && (
            <RuleNote label="Decision note">
              <span className="text-[15px]">“{app.decisionNote}”</span>
              {decidedBy && app.decidedAt && (
                <MonoMeta className="mt-2">
                  {decidedBy} · {formatDate(app.decidedAt)}
                </MonoMeta>
              )}
            </RuleNote>
          )}
          {user && (
            <Button
              size="sm"
              variant="arrow"
              href={`/admin/users/${user.id}`}
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
    tone: "red" | "primary" | "danger";
    required: boolean;
  }
> = {
  approved: {
    title: "Approve this tutor?",
    cta: "Approve tutor",
    hint: "They become a tutor straight away and get a public profile. Your note goes in their welcome email.",
    placeholder: "Lovely sample, clear plan. Welcome aboard!",
    tone: "red",
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
      eyebrow={decision ? `Decision · ${decision.app.name}` : undefined}
      title={copy?.title ?? ""}
      description={
        decision
          ? `${decision.app.name} · ${splitPlan(decision.app).title}`
          : undefined
      }
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="decision-form"
            variant={copy?.tone ?? "primary"}
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

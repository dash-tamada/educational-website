"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Field,
  Modal,
  RadioGroup,
  Select,
  Textarea,
  toast,
} from "@/components/app";
import { demo, useDb } from "@/lib/demo/store";
import {
  formatDate,
  formatINR,
  getCourses,
  getUser,
  isEnrolled,
  plural,
  type OrderRow,
  type Role,
} from "@/lib/mock";
import { refundContext, useAdminId } from "./shared";

/* =============================================================================
   Admin action dialogs reused across pages: grant course access, change role,
   suspend / reactivate, refund an order.
   ============================================================================= */

/* ----------------------------------------------------------------------------- grant */
export function GrantCourseModal({
  open,
  onClose,
  onDone,
  userIds,
  courseId: fixedCourse,
}: {
  open: boolean;
  onClose: () => void;
  /** called after a successful grant (before onClose), e.g. to clear a bulk selection */
  onDone?: () => void;
  userIds: string[];
  courseId?: string;
}) {
  const db = useDb();
  const adminId = useAdminId();
  const [courseId, setCourseId] = useState(fixedCourse ?? "");
  const [error, setError] = useState<string | null>(null);
  const courses = useMemo(
    () =>
      getCourses({ status: "published", sort: "title", pageSize: 500 }, db)
        .items,
    [db],
  );
  const users = userIds
    .map((id) => getUser(id, db))
    .filter((u): u is NonNullable<typeof u> => !!u);
  const single = users.length === 1 ? users[0] : null;
  const already = courseId
    ? users.filter((u) => isEnrolled(u.id, courseId, db))
    : [];
  const toGrant = users.filter((u) => !already.includes(u));

  const close = () => {
    setError(null);
    setCourseId(fixedCourse ?? "");
    onClose();
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return setError("Pick a course to unlock.");
    if (!toGrant.length)
      return setError(
        single
          ? `${single.name.split(" ")[0]} already has this course.`
          : "Everyone selected already has this course.",
      );
    toGrant.forEach((u) => demo.grantCourse(u.id, courseId, adminId));
    const title = courses.find((c) => c.id === courseId)?.title ?? "the course";
    toast.success(
      single
        ? `${single.name} now has ${title}.`
        : `Access granted to ${plural(toGrant.length, "person", "people")}.`,
      {
        description:
          "Logged as an admin grant (₹0 order). It shows up in their courses right away.",
      },
    );
    onDone?.();
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Grant course access"
      description={
        single
          ? `Unlock a full course for ${single.name}, free of charge.`
          : `Unlock a full course for ${plural(users.length, "person", "people")}, free of charge.`
      }
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="grant-form" icon="unlock">
            Grant access
          </Button>
        </>
      }
    >
      <form id="grant-form" onSubmit={submit} className="space-y-4" noValidate>
        <Field
          label="Course"
          error={error ?? undefined}
          hint="Published courses only. The learner gets a ₹0 order marked “Admin grant”."
        >
          <Select
            value={courseId}
            onChange={(e) => {
              setCourseId(e.target.value);
              setError(null);
            }}
            placeholder="Choose a course…"
            disabled={!!fixedCourse}
            options={courses.map((c) => ({
              value: c.id,
              label: `${c.title} · ${formatINR(c.price)}`,
            }))}
          />
        </Field>
        {!single && users.length > 1 && (
          <div className="rounded-tag bg-cream p-3 text-[14px]">
            <p className="font-bold">
              {plural(users.length, "person", "people")} selected
            </p>
            <p className="mt-1 text-ink/65">
              {users
                .slice(0, 6)
                .map((u) => u.name)
                .join(", ")}
              {users.length > 6 ? ` and ${users.length - 6} more` : ""}
            </p>
          </div>
        )}
        {already.length > 0 && (
          <p className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-ink/65">
            <Badge tone="butter" size="sm">
              Heads up
            </Badge>
            {single
              ? "Already enrolled in this course."
              : `${plural(already.length, "person is", "people are")} already enrolled and will be skipped.`}
          </p>
        )}
      </form>
    </Modal>
  );
}

/* ----------------------------------------------------------------------------- role */
const ROLE_OPTIONS: { value: Role; label: string; description: string }[] = [
  {
    value: "student",
    label: "Student",
    description: "Learns, buys courses, leaves reviews.",
  },
  {
    value: "tutor",
    label: "Tutor",
    description: "Builds courses in the tutor studio and earns payouts.",
  },
  {
    value: "admin",
    label: "Admin",
    description: "Full control room access. Give it sparingly.",
  },
];

export function ChangeRoleModal({
  open,
  onClose,
  userId,
}: {
  open: boolean;
  onClose: () => void;
  userId: string | null;
}) {
  const db = useDb();
  const user = userId ? getUser(userId, db) : null;
  const [role, setRole] = useState<Role | null>(null);
  const value = role ?? user?.role ?? "student";
  const liveCourses = user
    ? db.courses.filter(
        (c) => c.tutorId === user.id && c.status === "published",
      ).length
    : 0;
  const close = () => {
    setRole(null);
    onClose();
  };
  if (!user) return null;
  const save = () => {
    if (value === user.role) return close();
    demo.setUserRole(user.id, value);
    toast.success(
      `${user.name} is now ${value === "admin" ? "an admin" : `a ${value}`}.`,
    );
    close();
  };
  return (
    <Modal
      open={open}
      onClose={close}
      title="Change role"
      description={`What should ${user.name} be able to do on Tamada Media?`}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button onClick={save} disabled={value === user.role}>
            Save role
          </Button>
        </>
      }
    >
      <RadioGroup
        label="Role"
        hideLabel
        name="role"
        value={value}
        onChange={setRole}
        variant="cards"
        options={ROLE_OPTIONS}
      />
      {user.role === "tutor" && value !== "tutor" && liveCourses > 0 && (
        <p className="mt-4 rounded-tag bg-[#ffe1d4] p-3 text-[14px] font-semibold text-[#8a2600]">
          {user.name.split(" ")[0]} has{" "}
          {plural(liveCourses, "published course")}. They stay live, but{" "}
          {user.name.split(" ")[0]} loses studio access until you switch back.
        </p>
      )}
    </Modal>
  );
}

/* ----------------------------------------------------------------------------- suspend */
export function SuspendModal({
  open,
  onClose,
  onDone,
  userIds,
}: {
  open: boolean;
  onClose: () => void;
  /** called after the change is applied (before onClose) */
  onDone?: () => void;
  userIds: string[];
}) {
  const db = useDb();
  const adminId = useAdminId();
  const [reason, setReason] = useState("");
  const users = userIds
    .map((id) => getUser(id, db))
    .filter((u): u is NonNullable<typeof u> => !!u && u.id !== adminId);
  const allSuspended =
    users.length > 0 && users.every((u) => u.status === "suspended");
  const next = allSuspended ? "active" : "suspended";
  const close = () => {
    setReason("");
    onClose();
  };
  if (!users.length) return null;
  const single = users.length === 1 ? users[0] : null;
  const go = () => {
    // the note may be empty: the store still records who suspended them and when
    users.forEach((u) =>
      next === "suspended"
        ? demo.setUserStatus(u.id, "suspended", reason, adminId)
        : demo.setUserStatus(u.id, "active"),
    );
    toast.success(
      next === "suspended"
        ? single
          ? `${single.name} is suspended.`
          : `${plural(users.length, "account")} suspended.`
        : single
          ? `${single.name} is back in.`
          : `${plural(users.length, "account")} reactivated.`,
      {
        description:
          next === "suspended"
            ? "They can't sign in or buy until you reactivate them."
            : "They can sign in and learn again.",
      },
    );
    onDone?.();
    close();
  };
  return (
    <Modal
      open={open}
      onClose={close}
      size="sm"
      title={
        next === "suspended"
          ? single
            ? `Suspend ${single.name}?`
            : `Suspend ${plural(users.length, "account")}?`
          : single
            ? `Reactivate ${single.name}?`
            : `Reactivate ${plural(users.length, "account")}?`
      }
      description={
        next === "suspended"
          ? "They won't be able to sign in, buy courses or post in Q&A. Their purchases and progress are kept."
          : "They get their account back exactly as they left it."
      }
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            variant={next === "suspended" ? "danger" : "success"}
            onClick={go}
          >
            {next === "suspended" ? "Suspend" : "Reactivate"}
          </Button>
        </>
      }
    >
      {next === "suspended" && (
        <Field
          label="Internal note"
          optional
          hint="Only admins see this. It shows on their profile while they're suspended."
        >
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Repeated spam links in lesson Q&A"
            maxLength={240}
            showCount
          />
        </Field>
      )}
    </Modal>
  );
}

/* ----------------------------------------------------------------------------- refund */
const REFUND_REASONS = [
  {
    value: "Learner asked within 7 days",
    label: "Learner asked within 7 days",
  },
  { value: "Bought the wrong course", label: "Bought the wrong course" },
  { value: "Duplicate payment", label: "Duplicate payment" },
  {
    value: "Goodwill refund outside policy",
    label: "Goodwill refund (outside policy)",
  },
  {
    value: "Technical problem with the course",
    label: "Technical problem with the course",
  },
  { value: "Other", label: "Other (explain below)" },
];

export function RefundModal({
  order,
  onClose,
}: {
  order: OrderRow | null;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setReason("");
    setNote("");
    setError(null);
    onClose();
  };
  const db = useDb();
  const ctx = order ? refundContext(order, db) : null;
  // only suggest a reason the facts support; otherwise the admin picks one
  const initial =
    order?.refundRequest && ctx
      ? ctx.duplicate
        ? "Duplicate payment"
        : !ctx.claimsDuplicate && ctx.insidePolicy
          ? "Learner asked within 7 days"
          : ""
      : "";
  const value = reason || initial;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    if (!value) return setError("Pick a reason so the books make sense later.");
    if (value === "Other" && note.trim().length < 6)
      return setError("Add a short explanation for “Other”.");
    demo.refundOrder(
      order.id,
      value === "Other"
        ? note
        : note.trim()
          ? `${value}: ${note.trim()}`
          : value,
    );
    toast.success(`Refunded ${formatINR(order.amount)} for ${order.number}.`, {
      description:
        "Course access was removed. The money goes back in 5–7 working days.",
    });
    close();
  };
  return (
    <Modal
      open={!!order}
      onClose={close}
      title={order ? `Refund ${order.number}?` : "Refund"}
      description={
        order
          ? `${formatINR(order.amount)} back to ${order.user?.name ?? "the learner"} via ${order.method}. Their access to ${order.course?.title ?? "the course"} ends straight away.`
          : undefined
      }
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Keep the order
          </Button>
          <Button
            type="submit"
            form="refund-form"
            variant="danger"
            icon="refresh"
          >
            Issue refund
          </Button>
        </>
      }
    >
      <form id="refund-form" onSubmit={submit} className="space-y-4" noValidate>
        {order?.refundRequest && (
          <div className="rounded-tag bg-butter p-3 text-[14px]">
            <p className="font-bold">The learner wrote:</p>
            <p className="mt-1">“{order.refundRequest.reason}”</p>
          </div>
        )}
        {ctx && (
          <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-ink/65">
            <span>
              Bought {ctx.boughtDaysAgo === 0 ? "today" : plural(ctx.boughtDaysAgo, "day") + " ago"} ·{" "}
              {ctx.progress}% done
            </span>
            {ctx.flags.map((f) => (
              <Badge key={f} tone="flame" size="sm">
                {f}
              </Badge>
            ))}
            {ctx.insidePolicy && order?.refundRequest && (
              <Badge tone="mint" size="sm">
                Inside policy
              </Badge>
            )}
          </div>
        )}
        {ctx?.duplicateOf ? (
          <p className="rounded-tag bg-[#dfe8ff] p-3 text-[14px] font-semibold text-blue-deep">
            Also paid: {ctx.duplicateOf.number},{" "}
            {formatDate(ctx.duplicateOf.createdAt, "short")} ·{" "}
            {formatINR(ctx.duplicateOf.amount)} via {ctx.duplicateOf.method}.
            Looks like a genuine second charge.
          </p>
        ) : (
          ctx?.claimsDuplicate && (
            <p className="rounded-tag bg-cream p-3 text-[14px] font-semibold text-ink/75">
              No second charge for this course found. Check the payment
              provider before calling it a duplicate.
            </p>
          )
        )}
        <Field
          label="Reason"
          required
          error={error && !value ? error : undefined}
        >
          <Select
            value={value}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
            placeholder="Choose a reason…"
            options={REFUND_REASONS}
          />
        </Field>
        <Field
          label="Note"
          optional={value !== "Other"}
          required={value === "Other"}
          error={error && value ? error : undefined}
        >
          <Textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={240}
            showCount
            placeholder="Anything finance should know"
          />
        </Field>
      </form>
    </Modal>
  );
}

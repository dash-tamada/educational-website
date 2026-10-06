import { Fragment } from "react";
import clsx from "clsx";

/**
 * An email address inside running text. It is an inline-block, so when it no
 * longer fits after the words before it, it moves to its own line whole instead
 * of being cut mid-word ("…@gmail.co / m"). Only an address longer than a full
 * line breaks, and then at "@" or before a "." (the <wbr/> hints), with
 * overflow-wrap:anywhere as the last resort for one very long segment.
 */
export function EmailText({
  email,
  className,
  as: Tag = "strong",
}: {
  email: string;
  className?: string;
  as?: "strong" | "span";
}) {
  const at = email.indexOf("@");
  const local = at >= 0 ? email.slice(0, at) : email;
  const domain = at >= 0 ? email.slice(at + 1) : "";
  return (
    <Tag
      className={clsx(
        "inline-block max-w-full align-bottom [overflow-wrap:anywhere]",
        Tag === "strong" && "font-bold",
        className,
      )}
    >
      <Dotted text={local} />
      {at >= 0 && (
        <>
          @<wbr />
          <Dotted text={domain} />
        </>
      )}
    </Tag>
  );
}

/** "a.b.c" with a break hint before every dot. */
function Dotted({ text }: { text: string }) {
  const parts = text.split(".");
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <>
              <wbr />.
            </>
          )}
          {p}
        </Fragment>
      ))}
    </>
  );
}

/**
 * A URL inside a narrow value cell: same idea as EmailText, with break hints
 * after "//" and before every "/", "." and "?", so "instagram.com/priya.codes"
 * breaks at "/" rather than as "priya.cod / es".
 */
export function LinkText({
  url,
  className,
}: {
  url: string;
  className?: string;
}) {
  // keep the scheme ("https://") whole, then allow a break before / . ?
  const scheme = /^[a-z][a-z0-9+.-]*:\/\//i.exec(url)?.[0] ?? "";
  const parts = url.slice(scheme.length).split(/(?=[/.?])/);
  return (
    <span
      className={clsx(
        "inline-block max-w-full align-bottom [overflow-wrap:anywhere]",
        className,
      )}
    >
      {scheme}
      {scheme && <wbr />}
      {parts.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && <wbr />}
          {p}
        </Fragment>
      ))}
    </span>
  );
}

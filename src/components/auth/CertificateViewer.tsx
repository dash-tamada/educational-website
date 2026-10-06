"use client";

import { useEffect, useRef, useState } from "react";
import { FullScreenSheet, Icon } from "@/components/app";
import { CertificateSheet, type CertificateData } from "./CertificateSheet";

/** Width the landscape A4 sheet is laid out at (its container query flips at 896px). */
const SHEET_W = 960;
const SHEET_H = SHEET_W / 1.414;

/* =============================================================================
   Phones (MOBILE_SPEC A-05): the inline certificate is the stacked portrait card;
   tapping it opens the real landscape A4 sheet in a full-screen viewer, scaled to
   fit (bigger when the phone is turned sideways) and pinch-zoomable. From 640px
   the inline sheet is already the landscape version, so no viewer is offered.
   ============================================================================= */
export function CertificateViewer({
  data,
  footer,
  children,
}: {
  data: CertificateData;
  /** viewer footer actions (Download / Copy / Share); receives a close() for print */
  footer?: (close: () => void) => React.ReactNode;
  /** the inline sheet */
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <div className="relative">
      {children}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="View the certificate full size"
        className="no-print tap absolute inset-0 rounded-card-lg focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-blue sm:hidden"
      >
        <span className="absolute right-3 bottom-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[13px] font-bold text-cream shadow-soft">
          <Icon name="eye" className="size-4" strokeWidth={2.2} />
          View full size
        </span>
      </button>
      <FullScreenSheet
        open={open}
        onClose={close}
        title={`Certificate ${data.code}`}
        description="Pinch to zoom. Turn your phone sideways for a bigger view."
        bodyClassName="!px-3 bg-cream"
        footer={footer?.(close)}
        footerLayout="row"
      >
        <FitSheet data={data} />
      </FullScreenSheet>
    </div>
  );
}

/** The landscape sheet, scaled to fit the space it gets (re-fits on rotate / resize). */
function FitSheet({ data }: { data: CertificateData }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const fit = () => {
      const w = el.clientWidth;
      const h = el.clientHeight - 32; // minus the py-4 breathing room
      if (!w || h <= 0) return;
      setScale(Math.min(w / SHEET_W, h / SHEET_H));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div
      ref={box}
      className="flex h-full min-h-[200px] w-full items-center justify-center py-4"
    >
      <div
        style={{
          width: SHEET_W * scale,
          height: SHEET_H * scale,
          opacity: scale ? 1 : 0,
        }}
        className="relative shrink-0 transition-opacity duration-200"
      >
        <div
          style={{
            width: SHEET_W,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          className="absolute top-0 left-0"
        >
          <CertificateSheet data={data} />
        </div>
      </div>
    </div>
  );
}

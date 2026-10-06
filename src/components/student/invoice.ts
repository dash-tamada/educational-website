import { formatDate, formatINR, type OrderRow } from "@/lib/mock";

/* Mock GST invoice: a self-contained HTML file generated in the browser. It is
   clearly labelled as a demo document (no real tax data). */

/** One tax label for the drawer and the invoice. */
export const TAX_LABEL = "GST 18% (included)";

/** "Razorpay", "UPI", "Tamada team"… */
export function providerLabel(order: Pick<OrderRow, "provider">) {
  if (order.provider === "upi") return "UPI";
  if (order.provider === "admin") return "Tamada team";
  return order.provider.charAt(0).toUpperCase() + order.provider.slice(1);
}

/** "Card via Razorpay", or just "UPI" when the method and provider are the same thing. */
function paymentLine(order: OrderRow) {
  const provider = providerLabel(order);
  return order.method.toLowerCase() === provider.toLowerCase() ? order.method : `${order.method} via ${provider}`;
}

/** Admin grants: free access, so the "invoice" is an access confirmation without any tax lines. */
export const isGrant = (order: Pick<OrderRow, "provider">) => order.provider === "admin";

/** "Download invoice" / "Download access confirmation". */
export const invoiceLabel = (order: Pick<OrderRow, "provider">) => (isGrant(order) ? "Download access confirmation" : "Download invoice");

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function invoiceHtml(order: OrderRow, buyer: { name: string; email: string; city?: string }) {
  const grant = isGrant(order);
  const taxable = order.amount - order.tax;
  const rows: [string, string][] = [
    ["Course price", formatINR(order.subtotal)],
    ...(order.discount ? ([[`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`, `−${formatINR(order.discount)}`]] as [string, string][]) : []),
    ["Taxable value", formatINR(taxable)],
    [TAX_LABEL, formatINR(order.tax)],
  ];
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${grant ? "Access confirmation" : "Invoice"} ${esc(order.number)} · Tamada Media</title>
<style>
  *{box-sizing:border-box}body{margin:0;background:#f5f0e3;font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:#161616}
  .sheet{max-width:760px;margin:32px auto;background:#fff;border-radius:24px;padding:40px;box-shadow:0 18px 40px -20px rgba(22,22,22,.38)}
  .top{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;align-items:flex-start}
  .brand{font-weight:900;font-size:26px;letter-spacing:-.02em}.brand span{color:#ff008c}
  .demo{display:inline-block;margin-top:8px;background:#fff2b7;color:#6b5400;border-radius:999px;padding:4px 12px;font-size:12px;font-weight:700}
  h1{font-size:20px;margin:0 0 4px}.muted{color:rgba(22,22,22,.6)}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:32px 0}
  .label{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(22,22,22,.5);margin-bottom:4px}
  table{width:100%;border-collapse:collapse;margin-top:8px}th,td{text-align:left;padding:12px 0;border-bottom:1px solid rgba(22,22,22,.08)}
  th{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:rgba(22,22,22,.55)}td.r,th.r{text-align:right}
  .total td{font-weight:800;font-size:18px;border-bottom:0}
  .foot{margin-top:32px;padding-top:16px;border-top:1px dashed rgba(22,22,22,.2);font-size:12.5px;color:rgba(22,22,22,.6)}
  @media print{body{background:#fff}.sheet{box-shadow:none;margin:0}}
</style></head><body><main class="sheet">
  <div class="top">
    <div><div class="brand">Tamada <span>Media</span></div><div class="muted">Video courses for curious humans</div><div class="demo">${grant ? "Sample document" : "Sample invoice"} · demo data</div></div>
    <div style="text-align:right"><h1>${grant ? "Access confirmation" : "Tax invoice"}</h1><div class="muted">${esc(order.number)}</div><div class="muted">${esc(formatDate(order.createdAt, "long"))}</div></div>
  </div>
  <div class="grid">
    <div><div class="label">${grant ? "Issued to" : "Billed to"}</div><strong>${esc(buyer.name)}</strong><br>${esc(buyer.email)}${buyer.city ? `<br>${esc(buyer.city)}, India` : ""}</div>
    <div><div class="label">Payment</div>${grant ? "Granted by the Tamada team (no payment)" : esc(paymentLine(order))}<br><span class="muted">Ref: ${esc(order.providerRef)}</span><br>Status: <strong>${grant ? "Granted" : esc(order.status.charAt(0).toUpperCase() + order.status.slice(1))}</strong></div>
  </div>
  <table><thead><tr><th>Item</th><th class="r">Amount</th></tr></thead><tbody>
    ${
      grant
        ? `<tr><td><strong>${esc(order.course?.title ?? "Course")}</strong><br><span class="muted">Lifetime access · online video course</span></td><td class="r">Included</td></tr>
    <tr class="total"><td colspan="2">Granted by the Tamada team · no payment</td></tr>`
        : `<tr><td><strong>${esc(order.course?.title ?? "Course")}</strong><br><span class="muted">Lifetime access · online video course · SAC 999293</span></td><td class="r">${formatINR(order.subtotal)}</td></tr>
    ${rows.slice(1).map(([k, v]) => `<tr><td class="muted">${esc(k)}</td><td class="r">${esc(v)}</td></tr>`).join("")}
    <tr class="total"><td>Total ${order.status === "refunded" ? "(refunded)" : "paid"}</td><td class="r">${formatINR(order.amount)}</td></tr>`
    }
  </tbody></table>
  ${order.status === "refunded" && order.refundedAt ? `<p class="muted">Refunded on ${esc(formatDate(order.refundedAt, "long"))}${order.refundReason ? ` · ${esc(order.refundReason)}` : ""}.</p>` : ""}
  <div class="foot">This is a sample document generated by the Tamada Media demo. ${grant ? "Course access was granted free of charge, so there is nothing to invoice." : "It is not a real tax invoice and no payment was processed."} Questions? Reach us through the Contact page.</div>
</main></body></html>`;
}

export function downloadInvoice(order: OrderRow, buyer: { name: string; email: string; city?: string }) {
  const blob = new Blob([invoiceHtml(order, buyer)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Tamada-Media-${isGrant(order) ? "access-confirmation" : "invoice"}-${order.number}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

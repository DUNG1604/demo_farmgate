"use client";

import { useState } from "react";
import type { BotCard, ComparisonRow, OfferDraft, OfferField } from "@/advisor/types";
import type { Agreement } from "@/domain/types";
import { formatKg, formatMillion, formatSimTime, formatVnd } from "@/lib/format";
import { deliveryLabel, paymentLabel, rejectLabel } from "../labels";

const cardBase = "mt-1.5 rounded-2xl border p-3 text-[15px] shadow-sm";

function Missing() {
  return <span className="font-semibold text-amber-600">❓ chưa rõ</span>;
}

function BuyerBadge({ isRegular }: { isRegular?: boolean }) {
  if (isRegular === undefined) return null;
  return (
    <span
      className={`ml-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        isRegular ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
      }`}
    >
      {isRegular ? "mối quen" : "người mới"}
    </span>
  );
}

// ---------- Xác nhận chào giá ----------

export function OfferConfirmCard({
  draft,
  missing,
  depotName,
}: {
  draft: OfferDraft;
  missing: OfferField[];
  depotName: string;
}) {
  const has = (f: OfferField) => !missing.includes(f);
  const rows: [string, React.ReactNode][] = [
    [
      "Người mua",
      has("buyer") ? (
        <>
          <b>{draft.buyer}</b>
          {draft.buyerOrigin && <span className="text-zinc-500"> · {draft.buyerOrigin}</span>}
          <BuyerBadge isRegular={draft.isRegular} />
        </>
      ) : (
        <Missing />
      ),
    ],
    ["Giá", has("pricePerKg") ? <b>{formatVnd(draft.pricePerKg!)}/kg</b> : <Missing />],
    ["Trừ loại", has("rejectRate") ? rejectLabel(draft.rejectRate!) : <Missing />],
    ["Giao hàng", has("delivery") ? deliveryLabel(draft.delivery!, depotName) : <Missing />],
    ["Trả tiền", has("payment") ? paymentLabel(draft.payment!) : <Missing />],
  ];
  return (
    <div className={`${cardBase} border-green-200 bg-white`}>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-green-700">📝 Chào giá</div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-zinc-500">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ---------- Tiền thực nhận + phép tính ----------

export function NetBreakdownCard({ buyer, net, lines }: { buyer: string; net: number; lines: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className={`${cardBase} block w-full border-green-200 bg-white text-left`}
    >
      <div className="text-xs text-zinc-500">Bác cầm về (bán cho {buyer})</div>
      <div className="text-2xl font-bold text-green-700">{formatVnd(net)}</div>
      {open ? (
        <ul className="mt-2 space-y-0.5 border-t pt-2 text-sm text-zinc-700">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : (
        <div className="mt-1 text-xs text-green-700 underline">Xem cách tính</div>
      )}
    </button>
  );
}

// ---------- So sánh ----------

function ComparisonItem({ row, depotName }: { row: ComparisonRow; depotName: string }) {
  return (
    <li className={`rounded-xl p-2 ${row.best ? "bg-green-50 ring-1 ring-green-300" : ""}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">
          {row.best && "⭐ "}
          {row.buyer}
          <BuyerBadge isRegular={row.isRegular} />
        </span>
        <span className={`font-bold ${row.best ? "text-lg text-green-700" : "text-zinc-800"}`}>
          {formatMillion(row.net)}
        </span>
      </div>
      <div className="text-xs text-zinc-500">
        {formatVnd(row.pricePerKg)}/kg · {row.rejectRate === 0 ? "mua xô" : `trừ loại ${rejectLabel(row.rejectRate)}`} ·{" "}
        {deliveryLabel(row.delivery, depotName).toLowerCase()} · {paymentLabel(row.payment).toLowerCase()}
      </div>
      {row.risks.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {row.risks.map((risk) => (
            <span key={risk} className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800">
              ⚠ {risk}
            </span>
          ))}
        </div>
      )}
    </li>
  );
}

export function ComparisonCard({ rows, depotName }: { rows: ComparisonRow[]; depotName: string }) {
  return (
    <div className={`${cardBase} border-zinc-200 bg-white`}>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        📊 So tiền thực nhận
      </div>
      <ul className="space-y-1.5">
        {rows.map((row) => (
          <ComparisonItem key={row.offerId} row={row} depotName={depotName} />
        ))}
      </ul>
    </div>
  );
}

// ---------- Cảnh báo ----------

export function AlertCard({ level, title, body }: { level: "warning" | "danger"; title: string; body: string }) {
  const tone =
    level === "danger" ? "border-red-300 bg-red-50 text-red-900" : "border-amber-300 bg-amber-50 text-amber-900";
  return (
    <div className={`${cardBase} border-2 ${tone}`}>
      <div className="font-bold">⚠️ {title}</div>
      <p className="mt-1 leading-relaxed">{body}</p>
    </div>
  );
}

// ---------- Câu gợi ý ----------

export function SuggestedScriptCard({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Trình duyệt chặn clipboard — bỏ qua
    }
  };
  return (
    <div className={`${cardBase} border-sky-200 bg-sky-50`}>
      <p className="italic leading-relaxed text-sky-950">“{text}”</p>
      <button type="button" onClick={copy} className="mt-2 text-sm font-medium text-sky-700">
        {copied ? "✓ Đã sao chép" : "📋 Sao chép"}
      </button>
    </div>
  );
}

// ---------- Thỏa thuận đã lưu ----------

export function AgreementCard({ agreement, depotName }: { agreement: Agreement; depotName: string }) {
  return (
    <div className={`${cardBase} border-2 border-green-600 bg-white`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <span className="font-bold text-green-800">🔒 Thỏa thuận đã lưu</span>
        <span className="text-xs text-zinc-500">{formatSimTime(agreement.savedAt)}</span>
      </div>
      <ul className="mt-1.5 space-y-0.5">
        <li>
          Người mua: <b>{agreement.buyer}</b>
        </li>
        <li>
          Giá: <b>{formatVnd(agreement.pricePerKg)}/kg</b>
        </li>
        <li>
          Trừ loại tối đa: <b>{formatKg(agreement.maxRejectKg)}</b>
        </li>
        <li>Giao hàng: {deliveryLabel(agreement.delivery, depotName)}</li>
        <li>Trả tiền: {paymentLabel(agreement.payment)}</li>
      </ul>
    </div>
  );
}

// ---------- Tổng kết ----------

export function SummaryCard({
  buyer,
  soldKg,
  received,
  baselineNet,
  gain,
}: {
  buyer: string;
  soldKg: number;
  received: number;
  baselineNet: number;
  gain: number;
}) {
  return (
    <div className={`${cardBase} border-0 bg-green-700 text-white`}>
      <div className="text-sm opacity-90">
        ✅ Đã bán cho {buyer} · {formatKg(soldKg)} tính tiền
      </div>
      <div className="mt-1 text-3xl font-bold">{formatVnd(received)}</div>
      {gain > 0 && (
        <div className="mt-2 rounded-xl bg-white/15 px-3 py-2">
          Được thêm <b className="text-lg">{formatMillion(gain)}</b>
          <span className="text-sm opacity-90"> so với chào giá đầu ({formatMillion(baselineNet)})</span>
        </div>
      )}
    </div>
  );
}

// ---------- Chọn thẻ theo loại ----------

export function BotCardView({ card, depotName }: { card: BotCard; depotName: string }) {
  switch (card.type) {
    case "offer_confirm":
      return <OfferConfirmCard draft={card.draft} missing={card.missing} depotName={depotName} />;
    case "net_breakdown":
      return <NetBreakdownCard buyer={card.buyer} net={card.net} lines={card.lines} />;
    case "comparison":
      return <ComparisonCard rows={card.rows} depotName={depotName} />;
    case "alert":
      return <AlertCard level={card.level} title={card.title} body={card.body} />;
    case "suggested_script":
      return <SuggestedScriptCard text={card.text} />;
    case "agreement":
      return <AgreementCard agreement={card.agreement} depotName={depotName} />;
    case "summary":
      return <SummaryCard {...card} />;
  }
}

import { isExpired, rankOffers } from "@/advisor/fallback/rules";
import { calculateNet } from "@/domain/netCalculator";
import { advisorContext, type SessionState } from "@/domain/session";
import type { Offer } from "@/domain/types";
import { formatMillion, formatVnd } from "@/lib/format";
import { rejectLabel } from "../labels";

function statusOf(offer: Offer, session: SessionState): string | null {
  if (offer.status === "superseded") return "đã thay thế";
  if (isExpired(offer, session.now)) return "hết hạn";
  if (offer.payment === null) return "thiếu thông tin";
  return null;
}

export function OffersTable({ session }: { session: SessionState }) {
  if (session.offers.length === 0) {
    return <p className="text-sm text-zinc-500">Chưa có chào giá nào.</p>;
  }
  const ranked = rankOffers(advisorContext(session));
  const rowOf = new Map(ranked.map((r) => [r.offerId, r]));
  const chosen = session.agreement?.offerId;

  return (
    <div className="overflow-x-auto">
      <table className="w-full whitespace-nowrap text-left text-sm">
        <thead className="text-xs uppercase text-zinc-500">
          <tr>
            <th className="py-1 pr-2">Người mua</th>
            <th className="pr-2">Giá/kg</th>
            <th className="pr-2">Trừ loại</th>
            <th className="pr-2">Giao</th>
            <th className="pr-2">Trả tiền</th>
            <th className="pr-2 text-right">Thực nhận</th>
            <th>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {session.offers.map((offer) => {
            const net = calculateNet(offer, session.profile).net;
            const row = rowOf.get(offer.id);
            const status = statusOf(offer, session);
            const inactive = status !== null;
            return (
              <tr
                key={offer.id}
                className={`animate-flash border-t ${inactive ? "text-zinc-400 line-through" : ""} ${
                  row?.best ? "bg-green-50 font-medium" : ""
                }`}
              >
                <td className="py-1.5 pr-2">
                  {row?.best && "⭐ "}
                  {offer.buyer}
                  {offer.id === chosen && " 🔒"}
                </td>
                <td className="pr-2 tabular-nums">{formatVnd(offer.pricePerKg)}</td>
                <td className="pr-2">{offer.rejectRate === 0 ? "Mua xô" : rejectLabel(offer.rejectRate)}</td>
                <td className="pr-2">
                  {offer.delivery === "farm" ? "Tại vườn" : `Kho ${session.profile.depotName}`}
                </td>
                <td className="pr-2">
                  {offer.payment === null
                    ? "?"
                    : offer.payment.kind === "cash_on_weigh"
                      ? "Tiền mặt"
                      : `Sau ${offer.payment.days} ngày`}
                </td>
                <td className={`pr-2 text-right tabular-nums ${row?.best ? "font-bold text-green-700" : ""}`}>
                  {formatMillion(net)}
                </td>
                <td className="whitespace-normal text-xs">{status ?? row?.risks.join(", ")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

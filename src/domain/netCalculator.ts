// Mọi số tiền hiển thị cho nông dân đều đi ra từ file này hoặc weighCheck.ts.
// Xem claude/03-kien-truc.md §5.
import { formatKg, formatPercent, formatVnd } from "@/lib/format";
import type { FarmerProfile, Money, NetResult, Offer } from "./types";

export type NetInput = Pick<Offer, "pricePerKg" | "rejectRate" | "delivery">;
export type NetProfile = Pick<FarmerProfile, "totalKg" | "depotTransportCost" | "depotName">;

export function calculateNet(offer: NetInput, profile: NetProfile): NetResult {
  const billableKg = Math.round(profile.totalKg * (1 - offer.rejectRate));
  const gross = billableKg * offer.pricePerKg;
  const transportCost = offer.delivery === "depot" ? profile.depotTransportCost : 0;
  const net = gross - transportCost;

  const lines: string[] = [];
  if (offer.rejectRate > 0) {
    lines.push(
      `${formatKg(profile.totalKg)} trừ loại ${formatPercent(offer.rejectRate)} → ${formatKg(billableKg)} tính tiền`,
    );
  } else {
    lines.push(`${formatKg(billableKg)} tính tiền (không trừ loại)`);
  }
  lines.push(`${formatKg(billableKg)} × ${formatVnd(offer.pricePerKg)} = ${formatVnd(gross)}`);
  if (transportCost > 0) {
    lines.push(`Trừ xe chở ra kho ${profile.depotName}: −${formatVnd(transportCost)}`);
  }
  lines.push(`Thực nhận: ${formatVnd(net)}`);

  return { billableKg, gross, transportCost, net, lines };
}

/** Cọc đề xuất = tỷ lệ × tiền thực nhận, làm tròn xuống bội số 100.000đ. */
export function suggestedDeposit(net: Money, rate: number): Money {
  return Math.floor((net * rate) / 100_000) * 100_000;
}

/** Số tiền được thêm so với mốc ban đầu (có thể âm). */
export function calculateGain(baseline: Money, received: Money): Money {
  return received - baseline;
}

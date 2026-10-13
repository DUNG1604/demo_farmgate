import type { SimDay, SimTime } from "@/domain/types";

const integerFormat = new Intl.NumberFormat("vi-VN");
const oneDecimalFormat = new Intl.NumberFormat("vi-VN", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** 25200000 → "25.200.000đ" */
export function formatVnd(amount: number): string {
  return `${integerFormat.format(amount)}đ`;
}

/** 25200000 → "25,2 triệu" · 25000000 → "25,0 triệu" */
export function formatMillion(amount: number): string {
  return `${oneDecimalFormat.format(amount / 1_000_000)} triệu`;
}

/** 2000 → "2.000 kg" */
export function formatKg(kg: number): string {
  return `${integerFormat.format(kg)} kg`;
}

/** 0.1 → "10%" */
export function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

const DAY_LABELS: Record<SimDay, string> = {
  thu2: "Thứ Hai",
  thu3: "Thứ Ba",
  thu4: "Thứ Tư",
  thu5: "Thứ Năm",
  thu6: "Thứ Sáu",
  thu7: "Thứ Bảy",
  cn: "Chủ nhật",
};

/** "thu4" → "Thứ Tư" */
export function dayLabel(day: SimDay): string {
  return DAY_LABELS[day];
}

/** { day: "thu4", time: "08:10" } → "Thứ Tư 08:10" */
export function formatSimTime(t: SimTime): string {
  return `${dayLabel(t.day)} ${t.time}`;
}

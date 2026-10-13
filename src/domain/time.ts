import { SIM_DAYS, type SimDay, type SimTime } from "./types";

function dayIndex(day: SimDay): number {
  return SIM_DAYS.indexOf(day);
}

function minutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** < 0 nếu a trước b, 0 nếu bằng, > 0 nếu a sau b. */
export function compareSimTime(a: SimTime, b: SimTime): number {
  return dayIndex(a.day) - dayIndex(b.day) || minutes(a.time) - minutes(b.time);
}

/** Số ngày lịch từ `from` tới `to` (bỏ qua giờ). */
export function daysBetween(from: SimDay, to: SimDay): number {
  return dayIndex(to) - dayIndex(from);
}

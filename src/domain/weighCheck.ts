// Đối chiếu kết quả cân với thỏa thuận đã lưu — xem claude/03-kien-truc.md §5.
import type { Agreement, WeighCheckResult, WeighReport } from "./types";

export function checkWeigh(agreement: Agreement, report: WeighReport): WeighCheckResult {
  const allowedRejectKg = agreement.maxRejectKg;
  const excessKg = Math.max(0, report.rejectKg - allowedRejectKg);
  const loss = excessKg * agreement.pricePerKg;
  const expectedCash = (report.totalKg - report.rejectKg) * agreement.pricePerKg;
  const cashMatches =
    report.cashReceived === undefined ? undefined : report.cashReceived === expectedCash;

  return { allowedRejectKg, excessKg, loss, expectedCash, cashMatches };
}

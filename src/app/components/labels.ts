// Nhãn hiển thị dùng chung cho các thẻ.
import type { Delivery, Payment } from "@/domain/types";
import { formatPercent } from "@/lib/format";

export function deliveryLabel(delivery: Delivery, depotName: string): string {
  return delivery === "farm" ? "Lấy tại vườn" : `Bác chở ra kho ${depotName}`;
}

export function paymentLabel(payment: Payment): string {
  return payment.kind === "cash_on_weigh" ? "Tiền mặt khi cân" : `Trả sau ${payment.days} ngày`;
}

export function rejectLabel(rate: number): string {
  return rate === 0 ? "Không (mua xô)" : formatPercent(rate);
}

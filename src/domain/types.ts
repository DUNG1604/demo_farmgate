// Kiểu dữ liệu lõi — xem claude/03-kien-truc.md §4.
// File này không import React.

/** Tiền VND, luôn là số nguyên. */
export type Money = number;

// ---------- Thời gian giả lập ----------

export const SIM_DAYS = ["thu2", "thu3", "thu4", "thu5", "thu6", "thu7", "cn"] as const;
export type SimDay = (typeof SIM_DAYS)[number];

/** Thời điểm trong kịch bản, vd { day: "thu4", time: "08:10" }. */
export interface SimTime {
  day: SimDay;
  /** "HH:MM", 24 giờ */
  time: string;
}

// ---------- Hồ sơ nông dân ----------

export interface PriceRange {
  min: Money;
  max: Money;
}

export interface FarmerProfile {
  name: string;
  location: string;
  crop: string;
  totalKg: number;
  harvestDay: SimDay;
  regularBuyers: string[];
  /** Tên kho thường chở hàng ra, vd "Tân Hương" */
  depotName: string;
  /** Chi phí một chuyến chở ra kho */
  depotTransportCost: Money;
  /** Giá tham chiếu tại vườn khu vực (loại 1), dữ liệu mock */
  refPrice: PriceRange;
}

// ---------- Chào giá ----------

/** farm = thương lái lấy tại vườn · depot = nông dân tự chở ra kho */
export type Delivery = "farm" | "depot";

export type Payment =
  | { kind: "cash_on_weigh" }
  | { kind: "deferred"; days: number };

export type OfferStatus = "draft" | "confirmed" | "superseded" | "expired";

export interface Offer {
  id: string;
  buyer: string;
  buyerOrigin?: string;
  /** Tra từ FarmerProfile.regularBuyers */
  isRegular: boolean;
  pricePerKg: Money;
  /** Tỷ lệ trừ loại, 0.10 = 10%; mua xô = 0 */
  rejectRate: number;
  delivery: Delivery;
  /** null = chưa rõ → phải hỏi lại nông dân, không đoán */
  payment: Payment | null;
  receivedAt: SimTime;
  expiresAt?: SimTime;
  status: OfferStatus;
}

export interface NetResult {
  billableKg: number;
  gross: Money;
  transportCost: Money;
  net: Money;
  /** Các dòng phép tính để hiển thị cho nông dân */
  lines: string[];
}

// ---------- Thỏa thuận & cân hàng ----------

/** Bất biến sau khi tạo. */
export interface Agreement {
  readonly offerId: string;
  readonly buyer: string;
  readonly pricePerKg: Money;
  readonly totalKg: number;
  readonly maxRejectKg: number;
  readonly delivery: Delivery;
  readonly payment: Payment;
  readonly savedAt: SimTime;
}

export interface WeighReport {
  totalKg: number;
  rejectKg: number;
  cashReceived?: Money;
}

export interface WeighCheckResult {
  allowedRejectKg: number;
  excessKg: number;
  loss: Money;
  expectedCash: Money;
  /** undefined khi nông dân chưa báo số tiền nhận */
  cashMatches?: boolean;
}

// ---------- Thời tiết ----------

export interface Weather {
  now: "sunny" | "rain";
  rainForecast?: { from: SimTime; to: SimTime };
}

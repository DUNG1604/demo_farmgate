// Giao diện chung của Advisor — xem claude/03-kien-truc.md §7.
import type {
  Agreement,
  Delivery,
  FarmerProfile,
  Money,
  Offer,
  Payment,
  SimTime,
  Weather,
  WeighReport,
} from "@/domain/types";

// ---------- Hiểu tin nhắn ----------

/** Các trường của chào giá mà parser cố gắng tách ra. */
export type OfferField = "buyer" | "pricePerKg" | "rejectRate" | "delivery" | "payment";

export interface OfferDraft {
  buyer?: string;
  buyerOrigin?: string;
  isRegular?: boolean;
  pricePerKg?: Money;
  rejectRate?: number;
  delivery?: Delivery;
  payment?: Payment;
}

export interface ParseContext {
  regularBuyers: string[];
  /** Người mua đã có chào giá trong phiên — nhắc lại tên họ = cập nhật chào giá */
  knownBuyers: string[];
  /** Người mua vừa được nhắc tới gần nhất — dùng khi nông dân nói "nó" */
  lastBuyer?: string;
  /** "weighing" = đã chốt, đang cân hàng */
  stage: "offers" | "weighing";
  /** Chào giá đang chờ bác bổ sung/xác nhận — câu trả lời ngắn ("tiền mặt") được gộp vào đây */
  pendingDraft?: OfferDraft;
}

export type ParseResult =
  | { kind: "offer"; draft: OfferDraft; missing: OfferField[] }
  | { kind: "offer_update"; buyer: string; patch: OfferDraft }
  | { kind: "weigh"; report: Partial<WeighReport> }
  | { kind: "unknown" };

// ---------- Trả lời ----------

export interface AdvisorContext {
  profile: FarmerProfile;
  now: SimTime;
  weather: Weather;
  /** Theo thứ tự nhận; gồm cả chào giá đã bị thay thế (superseded) */
  offers: Offer[];
  agreement?: Agreement;
}

/** Sự việc khiến FarmGate phải lên tiếng. */
export type Trigger =
  | { type: "tick" }
  | { type: "offer_draft"; draft: OfferDraft; missing: OfferField[] }
  | { type: "offer_confirmed"; offerId: string; previousOfferId?: string }
  | { type: "weather_changed" }
  | { type: "deal_confirmed" }
  | { type: "deal_declined" }
  | { type: "offer_discarded" }
  | { type: "weigh"; report: WeighReport }
  | { type: "unknown" };

/** Hành động nông dân có thể bấm. Chỉ nông dân bấm mới sinh ra action thật (T5). */
export type ChipAction =
  | { type: "confirm_offer" }
  | { type: "edit_offer" }
  | { type: "set_field"; patch: OfferDraft }
  | { type: "confirm_deal"; offerId: string }
  | { type: "decline_deal" };

export interface Chip {
  label: string;
  action: ChipAction;
}

export interface ComparisonRow {
  offerId: string;
  buyer: string;
  isRegular: boolean;
  pricePerKg: Money;
  rejectRate: number;
  delivery: Delivery;
  payment: Payment;
  net: Money;
  risks: string[];
  best: boolean;
}

export type BotCard =
  | { type: "offer_confirm"; draft: OfferDraft; missing: OfferField[] }
  | { type: "net_breakdown"; offerId: string; buyer: string; net: Money; lines: string[] }
  | { type: "comparison"; rows: ComparisonRow[] }
  | { type: "alert"; level: "warning" | "danger"; title: string; body: string }
  | { type: "suggested_script"; text: string }
  | { type: "agreement"; agreement: Agreement }
  | { type: "summary"; buyer: string; soldKg: number; received: Money; baselineNet: Money; gain: Money };

export interface BotMessage {
  text?: string;
  card?: BotCard;
}

export interface Recommendation {
  offerId: string;
  urgency: "sell_today" | "can_wait";
}

/** Đề xuất thay đổi trạng thái từ advisor. Guard cấm mọi effect chốt bán. */
export interface AdvisorEffect {
  type: string;
  [key: string]: unknown;
}

export interface AdvisorReply {
  messages: BotMessage[];
  /** Chip trả lời nhanh cho lượt tiếp theo của nông dân */
  chips: Chip[];
  recommendation?: Recommendation;
  effects: AdvisorEffect[];
  /** Luật đã áp dụng — hiển thị trong BrainLog */
  trace: string[];
}

export interface Advisor {
  readonly mode: "fallback" | "openai";
  parse(text: string, ctx: ParseContext): ParseResult;
  respond(trigger: Trigger, ctx: AdvisorContext): AdvisorReply;
}


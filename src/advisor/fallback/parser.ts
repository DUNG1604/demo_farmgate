// Fallback parser: câu tiếng Việt của nông dân → dữ liệu có cấu trúc.
// Không đoán: trường nào không tìm thấy thì để trống và báo trong `missing`.
// Xem bảng mẫu ở claude/03-kien-truc.md §7.
import type { Payment } from "@/domain/types";
import type { OfferDraft, OfferField, ParseContext, ParseResult } from "../types";
import {
  BUYER_TITLES,
  DELIVERY_DEPOT,
  DELIVERY_FARM,
  NO_REJECT,
  OFFER_CUE,
  PAY_CASH,
  PAY_DAYS,
  PAY_MONTH,
  PAY_WEEK,
  PRICE_CUE_BEFORE,
  PRONOUN,
  UNIT_DAY,
  UNIT_HALF,
  UNIT_KG,
  UNIT_MILLION,
  UNIT_MONTH,
  UNIT_PERCENT,
  UNIT_SUFFIX_DIGITS,
  UNIT_TA,
  UNIT_TAN,
  UNIT_THOUSAND,
  UNIT_WEEK,
  UPDATE_CUE,
  WEIGH_REJECT_CUE,
  WEIGH_TOTAL_CUE,
  normalize,
} from "./vocab";

// ---------- Tách con số kèm đơn vị ----------

export type NumKind = "price" | "percent" | "weight" | "days" | "money" | "bare";

export interface NumToken {
  kind: NumKind;
  /** price/money: đồng · percent: số phần trăm (10 = 10%) · weight: kg · days: ngày */
  value: number;
  start: number;
}

/** "14.000" → 14000 (dấu chấm hàng nghìn) · "25,2" → 25.2 (dấu phẩy thập phân) */
function parseRaw(raw: string): number {
  if (/^\d{1,3}(\.\d{3})+$/.test(raw)) return Number(raw.replace(/\./g, ""));
  return Number(raw.replace(",", "."));
}

const ANY_UNIT = [UNIT_PERCENT, UNIT_THOUSAND, UNIT_MILLION, UNIT_KG, UNIT_TA, UNIT_TAN, UNIT_DAY, UNIT_WEEK, UNIT_MONTH];

export function tokenizeNumbers(norm: string): NumToken[] {
  const tokens: NumToken[] = [];
  const re = /\d+(?:[.,]\d+)*/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(norm))) {
    const n = parseRaw(m[0]);
    let pos = m.index + m[0].length;
    const eat = (pattern: RegExp): RegExpMatchArray | null => {
      const hit = norm.slice(pos).match(pattern);
      if (hit) pos += hit[0].length;
      return hit;
    };
    /** Phần lẻ: "rưỡi" hoặc vài chữ số không kèm đơn vị khác — "14 nghìn 2", "25 triệu 2". */
    const fraction = (unit: number): number => {
      if (eat(UNIT_HALF)) return unit / 2;
      const digits = norm.slice(pos).match(UNIT_SUFFIX_DIGITS);
      if (!digits) return 0;
      const after = norm.slice(pos + digits[0].length);
      if (ANY_UNIT.some((u) => u.test(after))) return 0;
      pos += digits[0].length;
      return Number(digits[1]) * (unit / 10 ** digits[1].length);
    };

    let kind: NumKind = "bare";
    let value = n;
    if (eat(UNIT_PERCENT)) kind = "percent";
    else if (eat(UNIT_THOUSAND)) [kind, value] = ["price", n * 1_000 + fraction(1_000)];
    else if (eat(UNIT_MILLION)) [kind, value] = ["money", n * 1_000_000 + fraction(1_000_000)];
    else if (n < 1_000 && eat(UNIT_HALF)) [kind, value] = ["price", n * 1_000 + 500];
    else if (eat(UNIT_KG)) kind = "weight";
    else if (eat(UNIT_TA)) [kind, value] = ["weight", n * 100];
    else if (eat(UNIT_TAN)) [kind, value] = ["weight", n * 1_000];
    else if (eat(UNIT_DAY)) kind = "days";
    else if (eat(UNIT_WEEK)) [kind, value] = ["days", n * 7];
    else if (eat(UNIT_MONTH)) [kind, value] = ["days", n * 30];

    tokens.push({ kind, value: Math.round(value), start: m.index });
    re.lastIndex = pos;
  }
  return tokens;
}

// ---------- Từng trường ----------

function findPrice(norm: string, tokens: NumToken[]): number | undefined {
  const explicit = tokens.find((t) => t.kind === "price");
  if (explicit) return explicit.value;
  for (const t of tokens) {
    if (t.kind !== "bare") continue;
    if (t.value >= 1_000 && t.value <= 500_000) return t.value;
    const before = norm.slice(Math.max(0, t.start - 12), t.start);
    if (t.value >= 1 && t.value <= 200 && PRICE_CUE_BEFORE.test(before)) return t.value * 1_000;
  }
  return undefined;
}

function findRejectRate(norm: string, tokens: NumToken[]): number | undefined {
  const percent = tokens.find((t) => t.kind === "percent");
  if (percent) return percent.value / 100;
  if (NO_REJECT.test(norm)) return 0;
  return undefined;
}

function lastIndexOf(text: string, pattern: RegExp): number {
  let idx = -1;
  for (const m of text.matchAll(pattern)) idx = m.index;
  return idx;
}

/** Nói cả hai thì lấy ý sau cùng: "không chở ra kho nữa, lấy tại vườn" → farm. */
function findDelivery(norm: string): OfferDraft["delivery"] {
  const depot = lastIndexOf(norm, DELIVERY_DEPOT);
  const farm = lastIndexOf(norm, DELIVERY_FARM);
  if (depot < 0 && farm < 0) return undefined;
  return farm > depot ? "farm" : "depot";
}

function findPayment(norm: string): Payment | undefined {
  const days = norm.match(PAY_DAYS);
  if (days) return { kind: "deferred", days: Number(days[1] ?? days[2] ?? days[3]) };
  if (PAY_WEEK.test(norm)) return { kind: "deferred", days: 7 };
  if (PAY_MONTH.test(norm)) return { kind: "deferred", days: 30 };
  if (PAY_CASH.test(norm)) return { kind: "cash_on_weigh" };
  return undefined;
}

const TITLES = [...BUYER_TITLES, ...BUYER_TITLES.map(normalize)];
const TITLE_RE = new RegExp(`(?<!\\p{L})(?:${[...new Set(TITLES)].join("|")})\\s+(?=(\\p{L}+))`, "gu");

/** Tên người mua: danh xưng + chữ viết hoa ("ông Năm"), hoặc tên đã biết đứng một mình ("Tư"). */
function findBuyer(text: string, ctx: ParseContext): string | undefined {
  const lower = text.toLowerCase();
  for (const m of lower.matchAll(TITLE_RE)) {
    const start = m.index + m[0].length;
    const name = text.slice(start, start + m[1].length);
    if (name[0] !== name[0].toLowerCase()) return name;
  }
  for (const name of [...ctx.knownBuyers, ...ctx.regularBuyers]) {
    if (new RegExp(`(?<!\\p{L})${name}(?!\\p{L})`, "u").test(text)) return name;
  }
  return undefined;
}

function findOrigin(text: string): string | undefined {
  return text.match(/(?<!\p{L})ở\s+(\p{Lu}\p{Ll}*(?:\s+\p{Lu}\p{Ll}*)*)/u)?.[1];
}

// ---------- Cân hàng ----------

function parseWeigh(norm: string, tokens: NumToken[]): ParseResult {
  const report: { totalKg?: number; rejectKg?: number; cashReceived?: number } = {};
  for (const t of tokens) {
    if (t.kind === "money" || (t.kind === "bare" && t.value >= 1_000_000)) {
      report.cashReceived = t.value;
      continue;
    }
    if (t.kind !== "weight" && t.kind !== "bare") continue;
    const clauseStart = Math.max(...[",", ".", ";"].map((c) => norm.lastIndexOf(c, t.start - 1))) + 1;
    const clause = norm.slice(clauseStart, t.start);
    const totalAt = lastIndexOf(clause, WEIGH_TOTAL_CUE);
    const rejectAt = lastIndexOf(clause, WEIGH_REJECT_CUE);
    if (rejectAt > totalAt) report.rejectKg = t.value;
    else if (totalAt > rejectAt) report.totalKg = t.value;
  }
  return Object.keys(report).length > 0 ? { kind: "weigh", report } : { kind: "unknown" };
}

// ---------- Điểm vào ----------

const REQUIRED: OfferField[] = ["buyer", "pricePerKg", "rejectRate", "delivery", "payment"];

export function missingFields(draft: OfferDraft): OfferField[] {
  return REQUIRED.filter((f) => draft[f] === undefined);
}

export function parseMessage(text: string, ctx: ParseContext): ParseResult {
  const norm = normalize(text);
  const tokens = tokenizeNumbers(norm);

  if (ctx.stage === "weighing") return parseWeigh(norm, tokens);

  const fields: OfferDraft = {};
  const price = findPrice(norm, tokens);
  const rejectRate = findRejectRate(norm, tokens);
  const delivery = findDelivery(norm);
  const payment = findPayment(norm);
  if (price !== undefined) fields.pricePerKg = price;
  if (rejectRate !== undefined) fields.rejectRate = rejectRate;
  if (delivery !== undefined) fields.delivery = delivery;
  if (payment !== undefined) fields.payment = payment;

  const buyer = findBuyer(text, ctx);

  // Đang có thẻ chào giá chờ bổ sung → câu trả lời ngắn được gộp vào (trừ khi nói tên người khác)
  const pending = ctx.pendingDraft;
  if (pending && (!buyer || !pending.buyer || buyer === pending.buyer)) {
    if (Object.keys(fields).length > 0 || buyer) {
      const merged: OfferDraft = { ...pending, ...fields };
      if (buyer && !pending.buyer) {
        merged.buyer = buyer;
        merged.isRegular = ctx.regularBuyers.includes(buyer);
        const origin = findOrigin(text);
        if (origin) merged.buyerOrigin = origin;
      }
      return { kind: "offer", draft: merged, missing: missingFields(merged) };
    }
  }

  // Người mua đã có chào giá → đây là cập nhật. "Nó chịu..." → người được nhắc gần nhất.
  const target =
    buyer ?? (PRONOUN.test(norm) || UPDATE_CUE.test(norm) ? ctx.lastBuyer : undefined);
  if (target && ctx.knownBuyers.includes(target)) {
    return Object.keys(fields).length > 0
      ? { kind: "offer_update", buyer: target, patch: fields }
      : { kind: "unknown" };
  }

  if (price === undefined && !(buyer && OFFER_CUE.test(norm))) return { kind: "unknown" };

  const draft: OfferDraft = { ...fields };
  if (buyer) {
    draft.buyer = buyer;
    draft.isRegular = ctx.regularBuyers.includes(buyer);
    const origin = findOrigin(text);
    if (origin) draft.buyerOrigin = origin;
  }
  return { kind: "offer", draft, missing: missingFields(draft) };
}

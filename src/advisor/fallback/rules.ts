// Luật khuyến nghị R1–R7 — chỉ tính toán và ra quyết định, không viết lời.
// Kết quả ở đây là "sự thật do code tính" mà cả Fallback lẫn OpenAI advisor đều dùng.
// Xem claude/03-kien-truc.md §7.
import { calculateGain, calculateNet, suggestedDeposit } from "@/domain/netCalculator";
import { compareSimTime, daysBetween } from "@/domain/time";
import type {
  FarmerProfile,
  Money,
  Offer,
  Payment,
  SimTime,
  WeighCheckResult,
  WeighReport,
} from "@/domain/types";
import { checkWeigh } from "@/domain/weighCheck";
import { DEPOSIT_RATE } from "@/scenario/data";
import type { AdvisorContext, ComparisonRow, Trigger } from "../types";

/** Hai chào giá chênh nhau dưới mức này coi như ngang nhau → ưu tiên tiền mặt, rồi mối quen. */
export const TIE_BREAK_MARGIN: Money = 500_000;

export type CompleteOffer = Offer & { payment: Payment };

export function isComplete(offer: Offer): offer is CompleteOffer {
  return offer.payment !== null;
}

export function isExpired(offer: Offer, now: SimTime): boolean {
  return offer.expiresAt !== undefined && compareSimTime(offer.expiresAt, now) < 0;
}

/** Được phép dùng để khuyến nghị: đã xác nhận, đủ thông tin, chưa hết hạn. */
export function isEligible(offer: Offer, now: SimTime): offer is CompleteOffer {
  return offer.status === "confirmed" && isComplete(offer) && !isExpired(offer, now);
}

export function netOf(offer: Offer, profile: FarmerProfile): Money {
  return calculateNet(offer, profile).net;
}

export function daysToHarvest(ctx: AdvisorContext): number {
  return daysBetween(ctx.now.day, ctx.profile.harvestDay);
}

// ---------- R1: nhắc bắt đầu hỏi giá ----------

export function shouldRemindHarvest(ctx: AdvisorContext): boolean {
  return ctx.offers.length === 0 && daysToHarvest(ctx) >= 3;
}

// ---------- R2: phí chở cao → gợi ý lấy tại vườn ----------

export interface FarmUpgrade {
  currentNet: Money;
  farmNet: Money;
}

export function farmDeliveryUpgrade(offer: Offer, profile: FarmerProfile): FarmUpgrade | null {
  if (offer.delivery !== "depot") return null;
  const currentNet = netOf(offer, profile);
  const farmNet = netOf({ ...offer, delivery: "farm" }, profile);
  return farmNet > currentNet ? { currentNet, farmNet } : null;
}

// ---------- R3: người mới + trả chậm → đòi cọc ----------

export function depositAdvice(offer: Offer, profile: FarmerProfile): Money | null {
  if (offer.isRegular || offer.payment?.kind !== "deferred") return null;
  return suggestedDeposit(netOf(offer, profile), DEPOSIT_RATE);
}

// ---------- R4: xếp hạng, chọn tốt nhất ----------

function risksOf(offer: CompleteOffer, profile: FarmerProfile): string[] {
  const risks: string[] = [];
  if (!offer.isRegular) risks.push("người mới");
  if (offer.payment.kind === "deferred") risks.push(`trả sau ${offer.payment.days} ngày`);
  if (offer.delivery === "depot") risks.push(`tự chở ra kho ${profile.depotName}`);
  if (offer.expiresAt) risks.push(`hết hạn ${offer.expiresAt.time}`);
  return risks;
}

/** Điểm phụ khi hai chào giá gần bằng nhau: tiền mặt quan trọng hơn mối quen. */
function tieBreakScore(offer: CompleteOffer): number {
  return (offer.payment.kind === "cash_on_weigh" ? 2 : 0) + (offer.isRegular ? 1 : 0);
}

export function rankOffers(ctx: AdvisorContext): ComparisonRow[] {
  const eligible = ctx.offers
    .filter((o) => isEligible(o, ctx.now))
    .map((offer) => ({ offer, net: netOf(offer, ctx.profile) }))
    .sort((a, b) => b.net - a.net);
  if (eligible.length === 0) return [];

  const top = eligible[0].net;
  const best = eligible
    .filter((e) => top - e.net < TIE_BREAK_MARGIN)
    .sort((a, b) => tieBreakScore(b.offer) - tieBreakScore(a.offer) || b.net - a.net)[0];

  const rows = eligible.map(({ offer, net }) => ({
    offerId: offer.id,
    buyer: offer.buyer,
    isRegular: offer.isRegular,
    pricePerKg: offer.pricePerKg,
    rejectRate: offer.rejectRate,
    delivery: offer.delivery,
    payment: offer.payment,
    net,
    risks: risksOf(offer, ctx.profile),
    best: offer.id === best.offer.id,
  }));
  // Lựa chọn tốt nhất luôn đứng đầu bảng
  return [...rows.filter((r) => r.best), ...rows.filter((r) => !r.best)];
}

// ---------- R5 / R6: thời tiết & thời điểm chốt ----------

/** Mưa trùng hoặc ngay sau ngày thu hoạch → nên chốt sớm. */
export function rainThreatensHarvest(ctx: AdvisorContext): boolean {
  const rain = ctx.weather.rainForecast;
  if (!rain) return false;
  const harvest = ctx.profile.harvestDay;
  return daysBetween(harvest, rain.from.day) <= 1 && daysBetween(harvest, rain.to.day) >= 0;
}

export function canWait(ctx: AdvisorContext): boolean {
  return !rainThreatensHarvest(ctx) && daysToHarvest(ctx) >= 2;
}

// ---------- R7: kiểm tra lúc cân ----------

/** Tiền thực nhận của chào giá đầu tiên — mốc để tính "được thêm". */
export function baselineNet(ctx: AdvisorContext): Money | undefined {
  const first = ctx.offers.find((o) => o.status === "confirmed" || o.status === "superseded");
  return first ? netOf(first, ctx.profile) : undefined;
}

export interface WeighFacts {
  check: WeighCheckResult;
  /** Số tiền nhận thiếu so với đúng ra phải nhận (âm = nhận dư) */
  shortfall?: Money;
  baseline?: Money;
  gain?: Money;
}

export function weighFacts(ctx: AdvisorContext, report: WeighReport): WeighFacts | null {
  if (!ctx.agreement) return null;
  const check = checkWeigh(ctx.agreement, report);
  const facts: WeighFacts = { check };
  if (report.cashReceived !== undefined) {
    facts.shortfall = calculateGain(report.cashReceived, check.expectedCash);
    facts.baseline = baselineNet(ctx);
    if (facts.baseline !== undefined) facts.gain = calculateGain(facts.baseline, report.cashReceived);
  }
  return facts;
}

// ---------- Tập số tiền hợp lệ cho Guard ----------

/** Mọi số tiền mà code đã tính/biết ở lượt này. Tin nhắn chỉ được nhắc tới các số trong tập này. */
export function allowedAmounts(ctx: AdvisorContext, trigger: Trigger): Set<Money> {
  const { profile } = ctx;
  const amounts = new Set<Money>([profile.depotTransportCost, profile.refPrice.min, profile.refPrice.max]);

  for (const offer of ctx.offers) {
    const r = calculateNet(offer, profile);
    [offer.pricePerKg, r.gross, r.transportCost, r.net].forEach((n) => amounts.add(n));
    const upgrade = farmDeliveryUpgrade(offer, profile);
    if (upgrade) amounts.add(upgrade.farmNet);
    const deposit = depositAdvice(offer, profile);
    if (deposit !== null) amounts.add(deposit);
  }

  if (trigger.type === "offer_draft" && trigger.draft.pricePerKg !== undefined) {
    amounts.add(trigger.draft.pricePerKg);
  }

  if (ctx.agreement) amounts.add(ctx.agreement.pricePerKg);

  if (trigger.type === "weigh") {
    const facts = weighFacts(ctx, trigger.report);
    if (facts) {
      [facts.check.loss, facts.check.expectedCash].forEach((n) => amounts.add(n));
      [trigger.report.cashReceived, facts.shortfall, facts.baseline, facts.gain]
        .filter((n): n is Money => n !== undefined)
        .forEach((n) => amounts.add(Math.abs(n)));
    }
  }
  return amounts;
}

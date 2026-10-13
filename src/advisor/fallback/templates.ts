// Mẫu câu tiếng Việt cho Fallback advisor. Xưng "con" – gọi "bác".
// Mọi số tiền truyền vào đây phải đến từ rules.ts / domain — templates không tự tính.
import { daysBetween } from "@/domain/time";
import type { Agreement, FarmerProfile, Money, Offer, Payment, SimTime, Weather } from "@/domain/types";
import { dayLabel, formatKg, formatMillion, formatPercent, formatSimTime, formatVnd } from "@/lib/format";
import type { OfferField } from "../types";

/** "Tư" → "chú Tư" (đầu câu dùng capitalize). */
export function buyerRef(buyer: string): string {
  return `chú ${buyer}`;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** 14000 → "14" · 12500 → "12 rưỡi" · 14200 → "14 nghìn 2" — cách nông dân nói giá. */
export function spokenPrice(pricePerKg: Money): string {
  const thousands = Math.floor(pricePerKg / 1_000);
  const rest = pricePerKg % 1_000;
  if (rest === 0) return `${thousands}`;
  if (rest === 500) return `${thousands} rưỡi`;
  return `${thousands} nghìn ${rest / 100}`;
}

export function paymentLabel(payment: Payment): string {
  return payment.kind === "cash_on_weigh" ? "tiền mặt" : `trả sau ${payment.days} ngày`;
}

// ---------- R1 ----------

export function harvestReminder(profile: FarmerProfile, days: number): string {
  return (
    `Chào bác ${profile.name}, còn ${days} ngày nữa vườn ${profile.crop.toLowerCase()} thu hoạch. ` +
    `Giá tại vườn khu mình hôm nay khoảng ${formatVnd(profile.refPrice.min).replace("đ", "")}–` +
    `${formatVnd(profile.refPrice.max)}/kg (loại 1). Bác bắt đầu hỏi giá các mối được rồi. ` +
    `Ai báo giá thì bác nhắn hoặc nói cho con nghe nhé.`
  );
}

// ---------- Xác nhận chào giá ----------

export const CONFIRM_INTRO = "Con nghe vậy, bác xem đúng chưa:";
export const OFFER_DISCARDED = "Dạ, bác nói lại thông tin chào giá giúp con nhé.";

export function missingQuestion(field: OfferField, buyer?: string): string {
  const who = buyer ? capitalize(buyerRef(buyer)) : "Người ta";
  switch (field) {
    case "buyer":
      return "Ai trả giá này vậy bác? Bác nói tên giúp con nhé.";
    case "pricePerKg":
      return `${who} trả bao nhiêu một ký vậy bác?`;
    case "rejectRate":
      return `${who} có trừ hàng loại không bác?`;
    case "delivery":
      return `${who} lấy tại vườn hay bác phải chở ra kho?`;
    case "payment":
      return `${who} trả tiền lúc nào bác?`;
  }
}

// ---------- Sau khi xác nhận chào giá ----------

export function netHeadline(net: Money): string {
  return `Bác cầm về khoảng ${formatMillion(net)}.`;
}

export function updatedHeadline(buyer: string, net: Money, previousNet: Money): string {
  return net > previousNet
    ? `Tốt quá bác! ${capitalize(buyerRef(buyer))} giờ là ${formatMillion(net)}.`
    : `Con đã cập nhật: ${buyerRef(buyer)} giờ là ${formatMillion(net)} (trước là ${formatMillion(previousNet)}).`;
}

export function priceVsReference(offer: Offer, profile: FarmerProfile): string | null {
  if (offer.rejectRate === 0) return null; // mua xô không so được với giá loại 1
  if (offer.pricePerKg < profile.refPrice.min) return "Giá/kg này thấp hơn mặt bằng tại vườn khu mình.";
  if (offer.pricePerKg > profile.refPrice.max) return "Giá/kg này cao hơn mặt bằng khu mình.";
  return null;
}

export function farmUpgradeTip(offer: Offer, profile: FarmerProfile, farmNet: Money): string {
  return (
    `Tiền xe ra kho làm bác hụt ${formatVnd(profile.depotTransportCost)}. ` +
    `Bác thử nói: "Chú lấy tận vườn thì tôi để ${spokenPrice(offer.pricePerKg)}" — vậy bác được ${formatMillion(farmNet)}.`
  );
}

export function lowerPriceHigherNet(offer: Offer, other: Offer): string {
  const reason = offer.rejectRate === 0 ? " vì không bị trừ loại" : "";
  return `Giá/kg thấp hơn ${buyerRef(other.buyer)} nhưng tiền thực nhận cao hơn${reason}.`;
}

export function depositAlert(offer: Offer & { payment: Payment }, deposit: Money, rate: number) {
  const days = offer.payment.kind === "deferred" ? offer.payment.days : 0;
  return {
    title: "Người mới, trả chậm",
    body:
      `${capitalize(buyerRef(offer.buyer))} là người mới và trả sau ${days} ngày. ` +
      `Nếu bán, bác nên đòi cọc ít nhất ${formatPercent(rate)} (${formatVnd(deposit)}).`,
  };
}

export function bestLine(row: { buyer: string; net: Money; payment: Payment; isRegular: boolean }): string {
  return (
    `${capitalize(buyerRef(row.buyer))} đang là lựa chọn tốt nhất: ${formatMillion(row.net)}, ` +
    `${paymentLabel(row.payment)}, ${row.isRegular ? "mối quen" : "người mới"}.`
  );
}

export function canWaitLine(days: number): string {
  return `Còn ${days} ngày nữa mới thu hoạch, chưa cần chốt vội.`;
}

// ---------- R5: mưa ----------

function rainWindow(weather: Weather): string {
  const rain = weather.rainForecast!;
  const from = Number(rain.from.time.slice(0, 2)) >= 17 ? `tối ${dayLabel(rain.from.day)}` : dayLabel(rain.from.day);
  return `từ ${from} đến ${dayLabel(rain.to.day)}`;
}

export function rainAlert(profile: FarmerProfile, weather: Weather) {
  return {
    title: "Dự báo mưa",
    body:
      `Bác ơi, dự báo mưa lớn ${rainWindow(weather)}. ${capitalize(profile.crop.toLowerCase())} chín gặp mưa dễ nứt, ` +
      `giá có thể rớt 15–20%. Con khuyên bác chốt trong hôm nay.`,
  };
}

export function closingScript(offer: Offer & { payment: Payment }, now: SimTime, profile: FarmerProfile): string {
  const when = daysBetween(now.day, profile.harvestDay) === 1 ? "sáng mai" : "hôm nay";
  const delivery = offer.delivery === "farm" ? "lấy tại vườn" : "tôi chở ra kho";
  const reject = offer.rejectRate > 0 ? `trừ loại không quá ${formatPercent(offer.rejectRate)}` : "mua xô";
  const payment =
    offer.payment.kind === "cash_on_weigh" ? "trả tiền mặt lúc cân" : `trả sau ${offer.payment.days} ngày`;
  return `${offer.buyer} ơi, ${when} cắt luôn nha, ${spokenPrice(offer.pricePerKg)} nghìn, ${delivery}, ${reject}, ${payment}.`;
}

export const NO_ELIGIBLE_OFFER = "Hiện chưa có chào giá nào đủ thông tin để so. Bác hỏi thêm vài mối giúp con nhé.";
export const WEATHER_OK = "Thời tiết mấy ngày tới ổn, bác chưa cần vội.";

// ---------- Chốt ----------

export const DEAL_SAVED = "Con đã lưu thỏa thuận này. Lúc cân có gì không đúng, bác nói con nghe nhé.";
export const DEAL_DECLINED = "Dạ, con tiếp tục theo dõi giá và thời tiết, có gì con báo bác ngay.";

// ---------- R7: cân ----------

function agreementWhen(agreement: Agreement, now: SimTime): string {
  return daysBetween(agreement.savedAt.day, now.day) === 1
    ? "hôm qua"
    : `lưu lúc ${formatSimTime(agreement.savedAt)}`;
}

export function overRejectAlert(agreement: Agreement, now: SimTime, rejectKg: number, excessKg: number, loss: Money) {
  return {
    title: "Bị trừ loại quá mức",
    body:
      `Thỏa thuận ${agreementWhen(agreement, now)}: trừ loại tối đa ${formatPercent(agreement.maxRejectKg / agreement.totalKg)} ` +
      `= ${formatKg(agreement.maxRejectKg)}. Trừ ${formatKg(rejectKg)} là bác thiệt thêm ${formatVnd(loss)} ` +
      `(${formatKg(excessKg)} × ${formatVnd(agreement.pricePerKg)}). ` +
      `Bác đưa ${buyerRef(agreement.buyer)} xem thỏa thuận đã lưu nhé.`,
  };
}

export function rejectWithinLimit(rejectKg: number, maxRejectKg: number): string {
  return `Loại ${formatKg(rejectKg)} vẫn trong mức thỏa thuận (tối đa ${formatKg(maxRejectKg)}). Nhận tiền xong bác báo con số tiền nhé.`;
}

export function cashCheckLine(soldKg: number, pricePerKg: Money, expected: Money): string {
  return `Kiểm tra: ${formatKg(soldKg)} × ${formatVnd(pricePerKg)} = ${formatVnd(expected)} ✅ khớp.`;
}

export function saleRecorded(agreement: Agreement, received: Money, baseline?: Money, gain?: Money): string {
  let text = `✅ Đã ghi nhận: bán ${formatKg(agreement.totalKg)} cho ${buyerRef(agreement.buyer)}, nhận ${formatVnd(received)}.`;
  if (baseline !== undefined && gain !== undefined && gain > 0) {
    text += ` So với chào giá đầu tiên (${formatMillion(baseline)}), bác được thêm ${formatMillion(gain)}.`;
  }
  return text;
}

export function cashMismatchAlert(received: Money, soldKg: number, pricePerKg: Money, expected: Money, shortfall: Money) {
  const diff = shortfall > 0 ? `thiếu ${formatVnd(shortfall)}` : `dư ${formatVnd(-shortfall)}`;
  return {
    title: "Tiền nhận không khớp",
    body:
      `Bác nhận ${formatVnd(received)}, nhưng ${formatKg(soldKg)} × ${formatVnd(pricePerKg)} ` +
      `phải là ${formatVnd(expected)} — ${diff}. Bác đếm lại giúp con nhé.`,
  };
}

export const NO_AGREEMENT_YET = "Bác chưa chốt bán với ai nên con chưa đối chiếu được. Chốt xong bác báo con nhé.";

// ---------- Không hiểu ----------

export const UNKNOWN_OFFERS = "Con chưa hiểu rõ, bác nói lại giá, trừ loại và giao ở đâu giúp con nhé.";
export const UNKNOWN_WEIGHING = "Con chưa hiểu, bác nói lại số ký bị trừ loại hoặc số tiền nhận giúp con nhé.";

/** Thay cho tin bị Guard chặn. */
export const SAFE_FALLBACK = "Con chưa chắc về thông tin này, bác đợi con kiểm tra lại nhé.";

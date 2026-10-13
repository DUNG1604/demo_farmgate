// Fallback advisor: luật cố định + mẫu câu, chạy không cần API key.
// Cùng interface với OpenAIAdvisor sau này. Mọi reply phải qua guardReply trước khi hiển thị (T5).
import { calculateNet } from "@/domain/netCalculator";
import type { Offer, WeighReport } from "@/domain/types";
import { formatVnd } from "@/lib/format";
import { DEPOSIT_RATE } from "@/scenario/data";
import { parseMessage } from "./fallback/parser";
import {
  canWait,
  daysToHarvest,
  depositAdvice,
  farmDeliveryUpgrade,
  isEligible,
  netOf,
  rainThreatensHarvest,
  rankOffers,
  shouldRemindHarvest,
  weighFacts,
} from "./fallback/rules";
import * as T from "./fallback/templates";
import type { Advisor, AdvisorContext, AdvisorReply, BotMessage, Chip, OfferDraft, OfferField, Trigger } from "./types";

function reply(messages: BotMessage[], extra: Partial<AdvisorReply> = {}): AdvisorReply {
  return { messages, chips: [], effects: [], trace: [], ...extra };
}

const FIELD_CHIPS: Partial<Record<OfferField, Chip[]>> = {
  rejectRate: [
    { label: "Mua xô, không trừ", action: { type: "set_field", patch: { rejectRate: 0 } } },
    { label: "Trừ 5%", action: { type: "set_field", patch: { rejectRate: 0.05 } } },
    { label: "Trừ 10%", action: { type: "set_field", patch: { rejectRate: 0.1 } } },
  ],
  delivery: [
    { label: "Lấy tại vườn", action: { type: "set_field", patch: { delivery: "farm" } } },
    { label: "Bác chở ra kho", action: { type: "set_field", patch: { delivery: "depot" } } },
  ],
  payment: [
    { label: "Tiền mặt khi cân", action: { type: "set_field", patch: { payment: { kind: "cash_on_weigh" } } } },
    { label: "Trả sau 7 ngày", action: { type: "set_field", patch: { payment: { kind: "deferred", days: 7 } } } },
    { label: "Trả sau 15 ngày", action: { type: "set_field", patch: { payment: { kind: "deferred", days: 15 } } } },
  ],
};

function onOfferDraft(draft: OfferDraft, missing: OfferField[]): AdvisorReply {
  const messages: BotMessage[] = [{ text: T.CONFIRM_INTRO, card: { type: "offer_confirm", draft, missing } }];
  if (missing.length === 0) {
    return reply(messages, {
      chips: [
        { label: "✅ Đúng", action: { type: "confirm_offer" } },
        { label: "✏️ Sửa", action: { type: "edit_offer" } },
      ],
      trace: ["Đủ thông tin → chờ bác xác nhận"],
    });
  }
  // Hỏi lần lượt từng trường thiếu, không đoán
  const field = missing[0];
  messages.push({ text: T.missingQuestion(field, draft.buyer) });
  return reply(messages, {
    chips: FIELD_CHIPS[field] ?? [],
    trace: [`Thiếu: ${missing.join(", ")} → hỏi lại "${field}"`],
  });
}

function onOfferConfirmed(ctx: AdvisorContext, offerId: string, previousOfferId?: string): AdvisorReply {
  const offer = ctx.offers.find((o) => o.id === offerId);
  if (!offer) return reply([{ text: T.UNKNOWN_OFFERS }]);
  const { profile } = ctx;
  const result = calculateNet(offer, profile);
  const messages: BotMessage[] = [];
  const trace = [`Tính tiền ròng (code): ${result.lines.join(" · ")}`];

  const previous = previousOfferId ? ctx.offers.find((o) => o.id === previousOfferId) : undefined;
  if (previous) {
    messages.push({ text: T.updatedHeadline(offer.buyer, result.net, netOf(previous, profile)) });
  } else {
    const notes = [T.netHeadline(result.net), T.priceVsReference(offer, profile)].filter(Boolean).join(" ");
    messages.push({
      text: notes,
      card: { type: "net_breakdown", offerId: offer.id, buyer: offer.buyer, net: result.net, lines: result.lines },
    });
  }

  const upgrade = farmDeliveryUpgrade(offer, profile);
  if (upgrade) {
    messages.push({ text: T.farmUpgradeTip(offer, profile, upgrade.farmNet) });
    trace.push("R2 phí chở cao → gợi ý đổi sang lấy tại vườn");
  }

  // So với chào giá khác: giá/kg thấp hơn mà tiền về cao hơn — đúng insight của sản phẩm
  const others = ctx.offers.filter((o) => o.id !== offer.id && isEligible(o, ctx.now));
  const beaten = others.find(
    (o) => offer.pricePerKg < o.pricePerKg && result.net > netOf(o, profile),
  );
  if (beaten && !previous) messages.push({ text: T.lowerPriceHigherNet(offer, beaten) });

  const deposit = depositAdvice(offer, profile);
  if (deposit !== null && offer.payment) {
    messages.push({ card: { type: "alert", level: "warning", ...T.depositAlert({ ...offer, payment: offer.payment }, deposit, DEPOSIT_RATE) } });
    trace.push("R3 người mới + trả chậm → đề xuất cọc");
  }

  const rows = rankOffers(ctx);
  const best = rows[0];
  let recommendation: AdvisorReply["recommendation"];
  if (rows.length >= 2) {
    const timing = canWait(ctx) ? ` ${T.canWaitLine(daysToHarvest(ctx))}` : "";
    messages.push({ text: T.bestLine(best) + timing, card: { type: "comparison", rows } });
    trace.push(`R4 xếp hạng → tốt nhất: ${best.buyer}`);
    if (timing) trace.push("R6 không mưa, còn ≥ 2 ngày → chưa cần vội");
  }
  if (best) recommendation = { offerId: best.offerId, urgency: rainThreatensHarvest(ctx) ? "sell_today" : "can_wait" };

  return reply(messages, { recommendation, trace });
}

function onWeather(ctx: AdvisorContext): AdvisorReply {
  if (!rainThreatensHarvest(ctx)) return reply([{ text: T.WEATHER_OK }], { trace: ["R6 thời tiết ổn"] });

  const rows = rankOffers(ctx);
  const alert: BotMessage = { card: { type: "alert", level: "warning", ...T.rainAlert(ctx.profile, ctx.weather) } };
  if (rows.length === 0) {
    return reply([alert, { text: T.NO_ELIGIBLE_OFFER }], { trace: ["R5 mưa, nhưng chưa có chào giá hợp lệ"] });
  }

  const best = ctx.offers.find((o) => o.id === rows[0].offerId) as Offer & { payment: NonNullable<Offer["payment"]> };
  const chips: Chip[] = [
    { label: `✅ Bác đã chốt với ${T.buyerRef(best.buyer)}`, action: { type: "confirm_deal", offerId: best.id } },
    ...rows.slice(1).map((r) => ({
      label: `Chọn ${T.buyerRef(r.buyer)}`,
      action: { type: "confirm_deal" as const, offerId: r.offerId },
    })),
    { label: "Chưa chốt", action: { type: "decline_deal" } },
  ];
  return reply(
    [
      alert,
      { text: T.bestLine(rows[0]), card: { type: "comparison", rows } },
      { text: "Đây là câu bác có thể nói:", card: { type: "suggested_script", text: T.closingScript(best, ctx.now, ctx.profile) } },
    ],
    {
      chips,
      recommendation: { offerId: best.id, urgency: "sell_today" },
      trace: ["R5 mưa trùng ngày thu hoạch → đổi khuyến nghị: chốt trong hôm nay", `R4 tốt nhất: ${best.buyer}`],
    },
  );
}

function onWeigh(ctx: AdvisorContext, report: WeighReport): AdvisorReply {
  const facts = weighFacts(ctx, report);
  const agreement = ctx.agreement;
  if (!facts || !agreement) return reply([{ text: T.NO_AGREEMENT_YET }]);
  const { check } = facts;
  const soldKg = report.totalKg - report.rejectKg;

  if (check.excessKg > 0) {
    return reply(
      [
        { card: { type: "alert", level: "danger", ...T.overRejectAlert(agreement, ctx.now, report.rejectKg, check.excessKg, check.loss) } },
        { card: { type: "agreement", agreement } },
      ],
      { trace: [`R7 trừ loại ${report.rejectKg}kg > ${check.allowedRejectKg}kg → thiệt ${formatVnd(check.loss)}`] },
    );
  }
  if (report.cashReceived === undefined) {
    return reply([{ text: T.rejectWithinLimit(report.rejectKg, check.allowedRejectKg) }], {
      trace: ["R7 trừ loại trong mức thỏa thuận"],
    });
  }
  if (!check.cashMatches) {
    return reply(
      [{ card: { type: "alert", level: "danger", ...T.cashMismatchAlert(report.cashReceived, soldKg, agreement.pricePerKg, check.expectedCash, facts.shortfall!) } }],
      { trace: ["R7 tiền nhận không khớp"] },
    );
  }
  return reply(
    [
      { text: T.cashCheckLine(soldKg, agreement.pricePerKg, check.expectedCash) },
      {
        text: T.saleRecorded(agreement, report.cashReceived, facts.baseline, facts.gain),
        card: {
          type: "summary",
          buyer: agreement.buyer,
          soldKg,
          received: report.cashReceived,
          baselineNet: facts.baseline ?? report.cashReceived,
          gain: facts.gain ?? 0,
        },
      },
    ],
    { trace: ["R7 tiền nhận khớp → hoàn tất"] },
  );
}

export const fallbackAdvisor: Advisor = {
  mode: "fallback",

  parse: parseMessage,

  respond(trigger: Trigger, ctx: AdvisorContext): AdvisorReply {
    switch (trigger.type) {
      case "tick":
        if (shouldRemindHarvest(ctx)) {
          return reply([{ text: T.harvestReminder(ctx.profile, daysToHarvest(ctx)) }], {
            trace: ["R1 còn ≥ 3 ngày tới thu hoạch, chưa có chào giá → nhắc hỏi giá"],
          });
        }
        return rainThreatensHarvest(ctx) ? onWeather(ctx) : reply([]);
      case "offer_draft":
        return onOfferDraft(trigger.draft, trigger.missing);
      case "offer_confirmed":
        return onOfferConfirmed(ctx, trigger.offerId, trigger.previousOfferId);
      case "weather_changed":
        return onWeather(ctx);
      case "deal_confirmed":
        return ctx.agreement
          ? reply([{ text: T.DEAL_SAVED, card: { type: "agreement", agreement: ctx.agreement } }], {
              trace: ["Nông dân bấm chốt → lưu thỏa thuận bất biến"],
            })
          : reply([{ text: T.UNKNOWN_OFFERS }]);
      case "deal_declined":
        return reply([{ text: T.DEAL_DECLINED }]);
      case "offer_discarded":
        return reply([{ text: T.OFFER_DISCARDED }], { trace: ["Bác bấm Sửa → bỏ thẻ, chờ nói lại"] });
      case "weigh":
        return onWeigh(ctx, trigger.report);
      case "unknown":
        return reply([{ text: ctx.agreement ? T.UNKNOWN_WEIGHING : T.UNKNOWN_OFFERS }], {
          trace: ["Không hiểu → hỏi lại, không đoán"],
        });
    }
  },
};

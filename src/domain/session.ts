// Phiên bán hàng: reducer thuần + state machine — xem claude/03-kien-truc.md §6.
//
//   CHUAN_BI ──(chào giá đầu tiên)──▶ DANG_HOI_GIA ──(FARMER_CONFIRMED_DEAL)──▶ DA_CHOT
//                                                                                │ báo cân
//                                                                                ▼
//                                               HOAN_TAT ◀──(tiền khớp)── DANG_CAN
//
// Bất biến: chỉ action FARMER_CONFIRMED_DEAL (sinh ra từ nút nông dân bấm) đưa phiên sang DA_CHOT.
// Advisor không bao giờ thay đổi trạng thái — reducer bỏ qua mọi `effects` của advisor.
import { missingFields } from "@/advisor/fallback/parser";
import { isEligible } from "@/advisor/fallback/rules";
import { normalize } from "@/advisor/fallback/vocab";
import type {
  Advisor,
  AdvisorContext,
  BotMessage,
  Chip,
  OfferDraft,
  OfferField,
  ParseContext,
  ParseResult,
  Recommendation,
  Trigger,
} from "@/advisor/types";
import { formatSimTime } from "@/lib/format";
import { FARMER_PROFILE, INITIAL_WEATHER, SCENARIO_START } from "@/scenario/data";
import { guardReply } from "./guard";
import type { Agreement, FarmerProfile, Offer, SimTime, Weather, WeighReport } from "./types";
import { checkWeigh } from "./weighCheck";

export type Phase = "CHUAN_BI" | "DANG_HOI_GIA" | "DA_CHOT" | "DANG_CAN" | "HOAN_TAT";

export type ChatItem =
  | { id: string; at: SimTime; from: "farmer"; text: string; voice?: boolean }
  | { id: string; at: SimTime; from: "bot"; message: BotMessage }
  | { id: string; at: SimTime; from: "system"; text: string };

export interface PendingDraft {
  draft: OfferDraft;
  missing: OfferField[];
  /** Có giá trị khi đây là cập nhật của một chào giá đã xác nhận */
  updateOf?: string;
}

/** Một lượt xử lý — hiển thị trong "Bộ não" (BrainLog). */
export interface BrainEntry {
  id: string;
  at: SimTime;
  input?: string;
  parse?: ParseResult;
  trigger: Trigger;
  trace: string[];
  violations: string[];
}

export interface SessionState {
  phase: Phase;
  profile: FarmerProfile;
  now: SimTime;
  weather: Weather;
  offers: Offer[];
  draft?: PendingDraft;
  agreement?: Agreement;
  /** Số liệu cân đã báo, cộng dồn qua nhiều tin */
  weigh?: Partial<WeighReport>;
  lastBuyer?: string;
  recommendation?: Recommendation;
  /** Nút trả lời nhanh đang hiện cho nông dân */
  chips: Chip[];
  chat: ChatItem[];
  brain: BrainEntry[];
  seq: number;
}

export type SessionAction =
  | { type: "TICK" }
  | { type: "CLOCK_ADVANCED"; to: SimTime }
  | { type: "WEATHER_CHANGED"; weather: Weather }
  | { type: "FARMER_MESSAGE"; text: string; voice?: boolean }
  | { type: "FARMER_SET_FIELD"; patch: OfferDraft; label: string }
  | { type: "FARMER_CONFIRMED_OFFER"; label?: string }
  | { type: "FARMER_EDIT_OFFER"; label?: string }
  | { type: "FARMER_CONFIRMED_DEAL"; offerId: string; label?: string }
  | { type: "FARMER_DECLINED_DEAL"; label?: string }
  | { type: "RESET" };

export function createInitialSession(
  profile: FarmerProfile = FARMER_PROFILE,
  now: SimTime = SCENARIO_START,
  weather: Weather = INITIAL_WEATHER,
): SessionState {
  return { phase: "CHUAN_BI", profile, now, weather, offers: [], chips: [], chat: [], brain: [], seq: 0 };
}

/** Nông dân bấm chip → action. Đây là con đường DUY NHẤT sinh ra FARMER_CONFIRMED_DEAL. */
export function chipToAction(chip: Chip): SessionAction {
  const label = chip.label;
  switch (chip.action.type) {
    case "set_field":
      return { type: "FARMER_SET_FIELD", patch: chip.action.patch, label };
    case "confirm_offer":
      return { type: "FARMER_CONFIRMED_OFFER", label };
    case "edit_offer":
      return { type: "FARMER_EDIT_OFFER", label };
    case "confirm_deal":
      return { type: "FARMER_CONFIRMED_DEAL", offerId: chip.action.offerId, label };
    case "decline_deal":
      return { type: "FARMER_DECLINED_DEAL", label };
  }
}

// ---------- Tiện ích ----------

function nextId(state: SessionState, prefix: string): [string, SessionState] {
  const seq = state.seq + 1;
  return [`${prefix}-${seq}`, { ...state, seq }];
}

/** Omit áp dụng cho từng nhánh của union (Omit thường làm mất các trường riêng của nhánh). */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type NewChatItem = DistributiveOmit<ChatItem, "id" | "at">;

function addChat(state: SessionState, item: NewChatItem): SessionState {
  const [id, next] = nextId(state, "msg");
  return { ...next, chat: [...next.chat, { ...item, id, at: state.now } as ChatItem] };
}

function farmerSays(state: SessionState, text: string | undefined, voice?: boolean): SessionState {
  // Nông dân hành động → nút cũ biến mất
  const cleared = { ...state, chips: [] };
  return text ? addChat(cleared, { from: "farmer", text, voice }) : cleared;
}

function isWeighing(state: SessionState): boolean {
  return state.phase === "DA_CHOT" || state.phase === "DANG_CAN" || state.phase === "HOAN_TAT";
}

function activeOffers(state: SessionState): Offer[] {
  return state.offers.filter((o) => o.status === "confirmed");
}

export function advisorContext(state: SessionState): AdvisorContext {
  return {
    profile: state.profile,
    now: state.now,
    weather: state.weather,
    offers: state.offers,
    agreement: state.agreement,
  };
}

export function parseContext(state: SessionState): ParseContext {
  return {
    regularBuyers: state.profile.regularBuyers,
    knownBuyers: [...new Set(activeOffers(state).map((o) => o.buyer))],
    lastBuyer: state.lastBuyer,
    stage: isWeighing(state) ? "weighing" : "offers",
    pendingDraft: state.draft?.draft,
  };
}

/** Gọi advisor → Guard → đưa tin vào chat + ghi BrainLog. */
function respond(
  advisor: Advisor,
  state: SessionState,
  trigger: Trigger,
  meta: { input?: string; parse?: ParseResult } = {},
): SessionState {
  const ctx = advisorContext(state);
  const { reply, violations } = guardReply(advisor.respond(trigger, ctx), ctx, trigger);

  let next = state;
  for (const message of reply.messages) next = addChat(next, { from: "bot", message });
  const [brainId, withId] = nextId(next, "brain");
  return {
    ...withId,
    chips: reply.chips,
    recommendation: reply.recommendation ?? state.recommendation,
    brain: [...withId.brain, { id: brainId, at: state.now, ...meta, trigger, trace: reply.trace, violations }],
  };
}

function withDraft(state: SessionState, draft: OfferDraft, updateOf?: string): SessionState {
  const missing = missingFields(draft);
  return { ...state, draft: { draft, missing, updateOf }, lastBuyer: draft.buyer ?? state.lastBuyer };
}

function draftFromOffer(offer: Offer): OfferDraft {
  const draft: OfferDraft = {
    buyer: offer.buyer,
    isRegular: offer.isRegular,
    pricePerKg: offer.pricePerKg,
    rejectRate: offer.rejectRate,
    delivery: offer.delivery,
  };
  if (offer.buyerOrigin) draft.buyerOrigin = offer.buyerOrigin;
  if (offer.payment) draft.payment = offer.payment;
  return draft;
}

// ---------- Xử lý từng loại sự việc ----------

function handleWeighMessage(advisor: Advisor, state: SessionState, report: Partial<WeighReport>, meta: { input: string; parse: ParseResult }) {
  const agreement = state.agreement!;
  const merged: Partial<WeighReport> = {
    totalKg: report.totalKg ?? state.weigh?.totalKg ?? agreement.totalKg,
    rejectKg: report.rejectKg ?? state.weigh?.rejectKg,
    cashReceived: report.cashReceived,
  };
  let next: SessionState = { ...state, weigh: merged, phase: state.phase === "DA_CHOT" ? "DANG_CAN" : state.phase };
  if (merged.rejectKg === undefined) return respond(advisor, next, { type: "unknown" }, meta);

  const full: WeighReport = { totalKg: merged.totalKg!, rejectKg: merged.rejectKg, cashReceived: merged.cashReceived };
  const check = checkWeigh(agreement, full);
  if (check.excessKg === 0 && check.cashMatches === true) next = { ...next, phase: "HOAN_TAT" };
  return respond(advisor, next, { type: "weigh", report: full }, meta);
}

function handleFarmerMessage(advisor: Advisor, state: SessionState, text: string, voice?: boolean): SessionState {
  let next = farmerSays(state, text, voice);
  const parse = advisor.parse(text, parseContext(next));
  const meta = { input: text, parse };

  switch (parse.kind) {
    case "weigh":
      return next.agreement
        ? handleWeighMessage(advisor, next, parse.report, meta)
        : respond(advisor, next, { type: "unknown" }, meta);
    case "offer": {
      // Gộp vào thẻ đang chờ (nếu parser đã gộp) hoặc mở thẻ mới
      const sameDraft = next.draft && (!parse.draft.buyer || parse.draft.buyer === next.draft.draft.buyer);
      next = withDraft(next, parse.draft, sameDraft ? next.draft!.updateOf : undefined);
      return respond(advisor, next, { type: "offer_draft", draft: parse.draft, missing: next.draft!.missing }, meta);
    }
    case "offer_update": {
      const base = [...activeOffers(next)].reverse().find((o) => o.buyer === parse.buyer);
      if (!base) return respond(advisor, next, { type: "unknown" }, meta);
      next = withDraft(next, { ...draftFromOffer(base), ...parse.patch }, base.id);
      return respond(advisor, next, { type: "offer_draft", draft: next.draft!.draft, missing: next.draft!.missing }, meta);
    }
    case "unknown":
      return respond(advisor, next, { type: "unknown" }, meta);
  }
}

function handleConfirmOffer(advisor: Advisor, state: SessionState, label?: string): SessionState {
  const pending = state.draft;
  if (!pending || pending.missing.length > 0) return state;
  const d = pending.draft;

  let next = farmerSays(state, label);
  const [rawId, withSeq] = nextId(next, normalize(d.buyer!));
  next = withSeq;
  const offer: Offer = {
    id: rawId,
    buyer: d.buyer!,
    isRegular: d.isRegular ?? state.profile.regularBuyers.includes(d.buyer!),
    pricePerKg: d.pricePerKg!,
    rejectRate: d.rejectRate!,
    delivery: d.delivery!,
    payment: d.payment ?? null,
    receivedAt: state.now,
    status: "confirmed",
  };
  if (d.buyerOrigin) offer.buyerOrigin = d.buyerOrigin;

  const offers = next.offers.map((o) =>
    o.id === pending.updateOf ? { ...o, status: "superseded" as const } : o,
  );
  next = {
    ...next,
    offers: [...offers, offer],
    draft: undefined,
    lastBuyer: offer.buyer,
    phase: next.phase === "CHUAN_BI" ? "DANG_HOI_GIA" : next.phase,
  };
  return respond(advisor, next, { type: "offer_confirmed", offerId: offer.id, previousOfferId: pending.updateOf }, {
    input: label,
  });
}

function handleConfirmDeal(advisor: Advisor, state: SessionState, offerId: string, label?: string): SessionState {
  if (state.phase !== "DANG_HOI_GIA") return state;
  const offer = state.offers.find((o) => o.id === offerId);
  // Không chốt với chào giá hết hạn / bị thay thế / thiếu thông tin
  if (!offer || !isEligible(offer, state.now)) return state;

  const agreement: Agreement = Object.freeze({
    offerId: offer.id,
    buyer: offer.buyer,
    pricePerKg: offer.pricePerKg,
    totalKg: state.profile.totalKg,
    maxRejectKg: Math.round(state.profile.totalKg * offer.rejectRate),
    delivery: offer.delivery,
    payment: Object.freeze({ ...offer.payment }),
    savedAt: state.now,
  });
  const next: SessionState = { ...farmerSays(state, label), agreement, phase: "DA_CHOT", draft: undefined };
  return respond(advisor, next, { type: "deal_confirmed" }, { input: label });
}

// ---------- Reducer ----------

export function createSessionReducer(advisor: Advisor) {
  return function sessionReducer(state: SessionState, action: SessionAction): SessionState {
    switch (action.type) {
      case "RESET":
        return createInitialSession(state.profile);

      case "TICK":
        return respond(advisor, state, { type: "tick" });

      case "CLOCK_ADVANCED":
        return addChat({ ...state, now: action.to }, { from: "system", text: `— ${formatSimTime(action.to)} —` });

      case "WEATHER_CHANGED": {
        const next = { ...state, weather: action.weather };
        // Sau khi đã chốt thì chỉ cập nhật thời tiết, không khuyên gì thêm
        return isWeighing(next) ? next : respond(advisor, next, { type: "weather_changed" });
      }

      case "FARMER_MESSAGE":
        return handleFarmerMessage(advisor, state, action.text, action.voice);

      case "FARMER_SET_FIELD": {
        if (!state.draft) return state;
        let next = farmerSays(state, action.label);
        next = withDraft(next, { ...state.draft.draft, ...action.patch }, state.draft.updateOf);
        return respond(advisor, next, { type: "offer_draft", draft: next.draft!.draft, missing: next.draft!.missing }, {
          input: action.label,
        });
      }

      case "FARMER_CONFIRMED_OFFER":
        return handleConfirmOffer(advisor, state, action.label);

      case "FARMER_EDIT_OFFER":
        if (!state.draft) return state;
        return respond(advisor, { ...farmerSays(state, action.label), draft: undefined }, { type: "offer_discarded" }, {
          input: action.label,
        });

      case "FARMER_CONFIRMED_DEAL":
        return handleConfirmDeal(advisor, state, action.offerId, action.label);

      case "FARMER_DECLINED_DEAL":
        return respond(advisor, farmerSays(state, action.label), { type: "deal_declined" }, { input: action.label });
    }
  };
}

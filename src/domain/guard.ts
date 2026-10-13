// Guard — chạy trên mọi câu trả lời của advisor trước khi hiển thị.
// Chặn bằng code 4 lỗi cấm kỵ, kể cả khi advisor (luật hay LLM) trả lời sai.
// Xem claude/03-kien-truc.md §7.
import type { AdvisorContext, AdvisorReply, BotMessage, Trigger } from "@/advisor/types";
import { allowedAmounts, isEligible, netOf } from "@/advisor/fallback/rules";
import { SAFE_FALLBACK } from "@/advisor/fallback/templates";
import { formatMillion, formatVnd } from "@/lib/format";
import type { Money } from "./types";

export interface GuardResult {
  reply: AdvisorReply;
  violations: string[];
}

/** Effect mà advisor tuyệt đối không được phát ra — chỉ nông dân bấm nút mới chốt được. */
const FORBIDDEN_EFFECTS = new Set(["confirm_deal", "FARMER_CONFIRMED_DEAL"]);

function textsOf(message: BotMessage): string[] {
  const texts = message.text ? [message.text] : [];
  const card = message.card;
  if (card?.type === "alert") texts.push(card.title, card.body);
  if (card?.type === "suggested_script") texts.push(card.text);
  return texts;
}

/** Tìm các số tiền trong câu: "25.200.000đ", "13.000–14.500đ", "25,2 triệu". Bỏ qua khối lượng ("1.800 kg"). */
function moneyMentions(text: string): { raw: string; check: (allowed: Set<Money>) => boolean }[] {
  const found: { raw: string; check: (allowed: Set<Money>) => boolean }[] = [];
  for (const m of text.matchAll(/(\d{1,3}(?:\.\d{3})+)(?!\.?\d)(?!\s*kg)/g)) {
    const value = Number(m[1].replace(/\./g, ""));
    found.push({ raw: m[0], check: (allowed) => allowed.has(value) });
  }
  for (const m of text.matchAll(/\d+(?:,\d+)? triệu/g)) {
    found.push({
      raw: m[0],
      check: (allowed) => [...allowed].some((n) => formatMillion(n) === m[0]),
    });
  }
  return found;
}

export function guardReply(reply: AdvisorReply, ctx: AdvisorContext, trigger: Trigger): GuardResult {
  const violations: string[] = [];
  const allowed = allowedAmounts(ctx, trigger);
  const offerById = new Map(ctx.offers.map((o) => [o.id, o]));

  // 1. Mọi số tiền trong lời nói phải do code tính
  for (const message of reply.messages) {
    for (const text of textsOf(message)) {
      for (const mention of moneyMentions(text)) {
        if (!mention.check(allowed)) violations.push(`Số tiền "${mention.raw}" không do code tính`);
      }
    }
  }

  // 2 & 4. Khuyến nghị / bảng so sánh chỉ dùng chào giá hợp lệ, đủ thông tin, số tiền đúng
  const referenced = [
    ...(reply.recommendation ? [reply.recommendation.offerId] : []),
    ...reply.messages.flatMap((m) => (m.card?.type === "comparison" ? m.card.rows.map((r) => r.offerId) : [])),
  ];
  for (const id of referenced) {
    const offer = offerById.get(id);
    if (!offer) violations.push(`Chào giá "${id}" không tồn tại`);
    else if (!isEligible(offer, ctx.now)) {
      violations.push(`Chào giá của ${offer.buyer} đã hết hạn, bị thay thế hoặc còn thiếu thông tin`);
    }
  }
  for (const message of reply.messages) {
    const card = message.card;
    const rows = card?.type === "comparison" ? card.rows : [];
    for (const row of rows) {
      const offer = offerById.get(row.offerId);
      if (offer && row.net !== netOf(offer, ctx.profile)) {
        violations.push(`Tiền ròng của ${row.buyer} (${formatVnd(row.net)}) khác số code tính`);
      }
    }
  }

  // 3. Advisor không được tự chốt bán
  for (const effect of reply.effects) {
    if (FORBIDDEN_EFFECTS.has(effect.type)) violations.push(`Advisor cố tự chốt bán (${effect.type})`);
  }

  if (violations.length === 0) return { reply, violations };
  return {
    violations,
    reply: {
      messages: [{ text: SAFE_FALLBACK }],
      chips: [],
      effects: [],
      trace: [...reply.trace, ...violations.map((v) => `GUARD chặn: ${v}`)],
    },
  };
}

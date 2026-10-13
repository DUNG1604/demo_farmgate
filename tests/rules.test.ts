import { describe, expect, it } from "vitest";
import { fallbackAdvisor } from "@/advisor/fallbackAdvisor";
import {
  canWait,
  depositAdvice,
  farmDeliveryUpgrade,
  rainThreatensHarvest,
  rankOffers,
  shouldRemindHarvest,
  weighFacts,
} from "@/advisor/fallback/rules";
import type { AdvisorContext, AdvisorReply, BotMessage, Trigger } from "@/advisor/types";
import { guardReply } from "@/domain/guard";
import type { Agreement, Offer, SimTime } from "@/domain/types";
import { FARMER_PROFILE, INITIAL_WEATHER, RAIN_WEATHER } from "@/scenario/data";

// ---------- Dữ liệu kịch bản ----------

const tu1: Offer = {
  id: "tu-1",
  buyer: "Tư",
  isRegular: true,
  pricePerKg: 14_000,
  rejectRate: 0.1,
  delivery: "depot",
  payment: { kind: "cash_on_weigh" },
  receivedAt: { day: "thu4", time: "08:10" },
  status: "confirmed",
};
const nam: Offer = {
  id: "nam-1",
  buyer: "Năm",
  buyerOrigin: "Cái Bè",
  isRegular: false,
  pricePerKg: 12_500,
  rejectRate: 0,
  delivery: "farm",
  payment: { kind: "deferred", days: 7 },
  receivedAt: { day: "thu4", time: "15:00" },
  status: "confirmed",
};
const tu2: Offer = { ...tu1, id: "tu-2", delivery: "farm", receivedAt: { day: "thu4", time: "17:00" } };
const agreement: Agreement = {
  offerId: "tu-2",
  buyer: "Tư",
  pricePerKg: 14_000,
  totalKg: 2_000,
  maxRejectKg: 200,
  delivery: "farm",
  payment: { kind: "cash_on_weigh" },
  savedAt: { day: "thu5", time: "06:05" },
};

function ctx(now: SimTime, offers: Offer[], extra: Partial<AdvisorContext> = {}): AdvisorContext {
  return { profile: FARMER_PROFILE, now, weather: INITIAL_WEATHER, offers, ...extra };
}
const afterEvent3 = ctx({ day: "thu4", time: "15:00" }, [tu1, nam]);
const afterEvent4 = ctx({ day: "thu4", time: "17:00" }, [{ ...tu1, status: "superseded" }, nam, tu2]);
const event5 = { ...afterEvent4, now: { day: "thu5", time: "06:00" } as SimTime, weather: RAIN_WEATHER };
const event6 = { ...event5, now: { day: "thu6", time: "09:00" } as SimTime, agreement };

function allText(reply: AdvisorReply): string {
  return reply.messages
    .flatMap((m: BotMessage) => [
      m.text ?? "",
      m.card?.type === "alert" ? `${m.card.title} ${m.card.body}` : "",
      m.card?.type === "suggested_script" ? m.card.text : "",
    ])
    .join("\n");
}

/** Chạy advisor + guard, đảm bảo guard không chặn gì. */
function respond(trigger: Trigger, c: AdvisorContext): AdvisorReply {
  const raw = fallbackAdvisor.respond(trigger, c);
  const { violations } = guardReply(raw, c, trigger);
  expect(violations).toEqual([]);
  return raw;
}

// ---------- Từng luật ----------

describe("R1 — nhắc hỏi giá", () => {
  it("Thứ Ba, chưa có chào giá → nhắc", () => {
    const c = ctx({ day: "thu3", time: "07:00" }, []);
    expect(shouldRemindHarvest(c)).toBe(true);
    const text = allText(respond({ type: "tick" }, c));
    expect(text).toContain("còn 3 ngày nữa");
    expect(text).toContain("13.000–14.500đ/kg");
  });

  it("đã có chào giá → không nhắc", () => {
    expect(shouldRemindHarvest(afterEvent3)).toBe(false);
  });
});

describe("R2 — phí chở cao → gợi ý lấy tại vườn", () => {
  it("Tư chở ra kho: 23,7tr → nếu tại vườn 25,2tr", () => {
    expect(farmDeliveryUpgrade(tu1, FARMER_PROFILE)).toEqual({ currentNet: 23_700_000, farmNet: 25_200_000 });
    const text = allText(respond({ type: "offer_confirmed", offerId: "tu-1" }, ctx({ day: "thu4", time: "08:10" }, [tu1])));
    expect(text).toContain("23,7 triệu");
    expect(text).toContain('"Chú lấy tận vườn thì tôi để 14"');
    expect(text).toContain("25,2 triệu");
  });

  it("đã lấy tại vườn → không gợi ý", () => {
    expect(farmDeliveryUpgrade(tu2, FARMER_PROFILE)).toBeNull();
  });
});

describe("R3 — người mới + trả chậm → đòi cọc", () => {
  it("Năm: cọc 7.500.000đ", () => {
    expect(depositAdvice(nam, FARMER_PROFILE)).toBe(7_500_000);
    const text = allText(respond({ type: "offer_confirmed", offerId: "nam-1" }, afterEvent3));
    expect(text).toContain("25,0 triệu");
    expect(text).toContain("7.500.000đ");
    expect(text).toContain("không bị trừ loại");
  });

  it("mối quen hoặc tiền mặt → không cần cọc", () => {
    expect(depositAdvice(tu1, FARMER_PROFILE)).toBeNull();
    expect(depositAdvice({ ...nam, payment: { kind: "cash_on_weigh" } }, FARMER_PROFILE)).toBeNull();
  });
});

describe("R4 — xếp hạng", () => {
  it("sau sự kiện 3: Năm (25,0tr) hơn Tư (23,7tr)", () => {
    const rows = rankOffers(afterEvent3);
    expect(rows.map((r) => [r.buyer, r.net, r.best])).toEqual([
      ["Năm", 25_000_000, true],
      ["Tư", 23_700_000, false],
    ]);
  });

  it("sau sự kiện 4: Tư (25,2tr) đứng đầu, bỏ chào giá đã thay thế", () => {
    const rows = rankOffers(afterEvent4);
    expect(rows.map((r) => r.offerId)).toEqual(["tu-2", "nam-1"]);
  });

  it("chênh < 500.000đ → ưu tiên tiền mặt dù tiền ròng thấp hơn", () => {
    const namHigher = { ...nam, pricePerKg: 12_700 }; // 25,4tr, trả sau
    const rows = rankOffers(ctx({ day: "thu4", time: "17:00" }, [tu2, namHigher]));
    expect(rows[0].buyer).toBe("Tư");
  });

  it("chào giá hết hạn bị loại", () => {
    const expired = { ...nam, expiresAt: { day: "thu4", time: "12:00" } as SimTime };
    expect(rankOffers(ctx({ day: "thu4", time: "15:00" }, [tu1, expired])).map((r) => r.buyer)).toEqual(["Tư"]);
  });

  it("chào giá thiếu trả tiền bị loại", () => {
    expect(rankOffers(ctx({ day: "thu4", time: "08:10" }, [{ ...tu1, payment: null }]))).toEqual([]);
  });
});

describe("R5 / R6 — thời tiết", () => {
  it("không mưa, còn 2 ngày → chưa cần vội", () => {
    expect(canWait(afterEvent4)).toBe(true);
    expect(allText(respond({ type: "offer_confirmed", offerId: "tu-2", previousOfferId: "tu-1" }, afterEvent4))).toContain(
      "chưa cần chốt vội",
    );
  });

  it("mưa tối Thứ Sáu → chốt hôm nay, gợi ý câu nói và nút chốt", () => {
    expect(rainThreatensHarvest(event5)).toBe(true);
    const r = respond({ type: "weather_changed" }, event5);
    const text = allText(r);
    expect(text).toContain("tối Thứ Sáu đến Chủ nhật");
    expect(text).toContain("chốt trong hôm nay");
    expect(text).toContain(
      "Tư ơi, sáng mai cắt luôn nha, 14 nghìn, lấy tại vườn, trừ loại không quá 10%, trả tiền mặt lúc cân.",
    );
    expect(r.recommendation).toEqual({ offerId: "tu-2", urgency: "sell_today" });
    expect(r.chips.map((c) => c.label)).toEqual(["✅ Bác đã chốt với chú Tư", "Chọn chú Năm", "Chưa chốt"]);
    // Advisor chỉ đưa nút cho nông dân bấm, không tự chốt
    expect(r.effects).toEqual([]);
  });

  it("mưa xa sau thu hoạch → không gấp", () => {
    const far = {
      ...afterEvent4,
      weather: { now: "sunny" as const, rainForecast: { from: { day: "cn", time: "06:00" } as SimTime, to: { day: "cn", time: "20:00" } as SimTime } },
    };
    expect(rainThreatensHarvest(far)).toBe(false);
  });
});

describe("R7 — kiểm tra lúc cân", () => {
  it("chê loại 300kg → thiệt 1.400.000đ, kèm thỏa thuận", () => {
    const r = respond({ type: "weigh", report: { totalKg: 2_000, rejectKg: 300 } }, event6);
    const text = allText(r);
    expect(text).toContain("Thỏa thuận hôm qua");
    expect(text).toContain("1.400.000đ");
    expect(r.messages.some((m) => m.card?.type === "agreement")).toBe(true);
  });

  it("trừ 200kg, nhận 25,2tr → khớp, được thêm 1,5 triệu", () => {
    const report = { totalKg: 2_000, rejectKg: 200, cashReceived: 25_200_000 };
    expect(weighFacts(event6, report)).toMatchObject({ baseline: 23_700_000, gain: 1_500_000, shortfall: 0 });
    const text = allText(respond({ type: "weigh", report }, event6));
    expect(text).toContain("✅ khớp");
    expect(text).toContain("nhận 25.200.000đ");
    expect(text).toContain("bác được thêm 1,5 triệu");
  });

  it("nhận thiếu tiền → cảnh báo", () => {
    const text = allText(respond({ type: "weigh", report: { totalKg: 2_000, rejectKg: 200, cashReceived: 25_000_000 } }, event6));
    expect(text).toContain("thiếu 200.000đ");
  });
});

describe("hỏi lại khi thiếu thông tin", () => {
  it("Tư chưa nói trả tiền → hỏi kèm chip", () => {
    const r = respond(
      {
        type: "offer_draft",
        draft: { buyer: "Tư", isRegular: true, pricePerKg: 14_000, rejectRate: 0.1, delivery: "depot" },
        missing: ["payment"],
      },
      ctx({ day: "thu4", time: "08:10" }, []),
    );
    expect(allText(r)).toContain("Chú Tư trả tiền lúc nào bác?");
    expect(r.chips.map((c) => c.label)).toContain("Tiền mặt khi cân");
  });

  it("đủ thông tin → nút Đúng / Sửa", () => {
    const r = respond({ type: "offer_draft", draft: { buyer: "Năm" }, missing: [] }, afterEvent3);
    expect(r.chips.map((c) => c.label)).toEqual(["✅ Đúng", "✏️ Sửa"]);
  });
});

// ---------- Guard ----------

describe("Guard", () => {
  const ok: AdvisorReply = { messages: [], chips: [], effects: [], trace: [] };

  it("chặn số tiền không do code tính", () => {
    const bad = { ...ok, messages: [{ text: "Bác cầm về khoảng 26,0 triệu, tức 26.000.000đ." }] };
    const r = guardReply(bad, afterEvent3, { type: "tick" });
    expect(r.violations).toHaveLength(2);
    expect(r.reply.messages[0].text).toContain("Con chưa chắc");
  });

  it("cho qua số tiền đúng và bỏ qua khối lượng", () => {
    const good = { ...ok, messages: [{ text: "1.800 kg × 14.000đ = 25.200.000đ, cầm về 23,7 triệu." }] };
    expect(guardReply(good, afterEvent3, { type: "tick" }).violations).toEqual([]);
  });

  it("chặn khuyến nghị dùng chào giá đã bị thay thế", () => {
    const bad = { ...ok, recommendation: { offerId: "tu-1", urgency: "sell_today" as const } };
    expect(guardReply(bad, afterEvent4, { type: "tick" }).violations[0]).toContain("bị thay thế");
  });

  it("chặn khuyến nghị dùng chào giá hết hạn", () => {
    const expiring = { ...nam, expiresAt: { day: "thu4", time: "12:00" } as SimTime };
    const c = ctx({ day: "thu4", time: "15:00" }, [expiring]);
    const bad = { ...ok, recommendation: { offerId: "nam-1", urgency: "can_wait" as const } };
    expect(guardReply(bad, c, { type: "tick" }).violations).toHaveLength(1);
  });

  it("chặn khuyến nghị dựa trên chào giá còn thiếu thông tin", () => {
    const c = ctx({ day: "thu4", time: "08:10" }, [{ ...tu1, payment: null }]);
    const bad = { ...ok, recommendation: { offerId: "tu-1", urgency: "can_wait" as const } };
    expect(guardReply(bad, c, { type: "tick" }).violations).toHaveLength(1);
  });

  it("chặn advisor tự chốt bán", () => {
    const bad = { ...ok, effects: [{ type: "confirm_deal", offerId: "tu-2" }] };
    const r = guardReply(bad, afterEvent4, { type: "tick" });
    expect(r.violations[0]).toContain("tự chốt bán");
    expect(r.reply.effects).toEqual([]);
  });

  it("chặn bảng so sánh có tiền ròng sai", () => {
    const rows = rankOffers(afterEvent4).map((r) => (r.buyer === "Năm" ? { ...r, net: 26_000_000 } : r));
    const bad = { ...ok, messages: [{ card: { type: "comparison" as const, rows } }] };
    expect(guardReply(bad, afterEvent4, { type: "tick" }).violations).toHaveLength(1);
  });
});

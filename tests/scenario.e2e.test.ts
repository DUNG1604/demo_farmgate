// Chạy trọn 6 sự kiện của claude/01-kich-ban.md chỉ bằng reducer (không UI).
// Đây là chốt chặn: số liệu phải khớp bảng §4.
import { describe, expect, it } from "vitest";
import { fallbackAdvisor } from "@/advisor/fallbackAdvisor";
import type { BotMessage } from "@/advisor/types";
import {
  chipToAction,
  createInitialSession,
  createSessionReducer,
  type SessionAction,
  type SessionState,
} from "@/domain/session";
import { RAIN_WEATHER } from "@/scenario/data";

const reduce = createSessionReducer(fallbackAdvisor);

function run(state: SessionState, ...actions: SessionAction[]): SessionState {
  return actions.reduce(reduce, state);
}

/** Bấm chip theo nhãn (bắt đầu bằng) — giống nông dân bấm nút. */
function tap(state: SessionState, labelStart: string): SessionState {
  const chip = state.chips.find((c) => c.label.startsWith(labelStart));
  if (!chip) throw new Error(`Không có chip "${labelStart}". Đang có: ${state.chips.map((c) => c.label).join(" | ")}`);
  return reduce(state, chipToAction(chip));
}

function botTextSince(state: SessionState, fromIndex: number): string {
  return state.chat
    .slice(fromIndex)
    .flatMap((item) => {
      if (item.from !== "bot") return [];
      const m: BotMessage = item.message;
      const card = m.card;
      return [
        m.text ?? "",
        card?.type === "alert" ? card.body : "",
        card?.type === "suggested_script" ? card.text : "",
      ];
    })
    .join("\n");
}

const netOfBuyer = (s: SessionState, buyer: string) =>
  s.offers.filter((o) => o.buyer === buyer && o.status === "confirmed");

describe("Kịch bản đầy đủ 6 sự kiện", () => {
  let s = createInitialSession();
  let mark = 0;

  it("SK1 — Thứ Ba 07:00: FarmGate chủ động nhắc", () => {
    s = run(s, { type: "TICK" });
    expect(s.phase).toBe("CHUAN_BI");
    expect(botTextSince(s, mark)).toContain("còn 3 ngày nữa");
    mark = s.chat.length;
  });

  it("SK2 — Thứ Tư 08:10: Tư gọi, thiếu trả tiền → hỏi → xác nhận → 23,7tr", () => {
    s = run(
      s,
      { type: "CLOCK_ADVANCED", to: { day: "thu4", time: "08:10" } },
      {
        type: "FARMER_MESSAGE",
        voice: true,
        text: "Thằng Tư mới gọi, trả 14 nghìn, trừ loại 10 phần trăm, bắt mình chở ra kho Tân Hương",
      },
    );
    expect(s.draft?.missing).toEqual(["payment"]);
    expect(botTextSince(s, mark)).toContain("Chú Tư trả tiền lúc nào bác?");

    s = tap(s, "Tiền mặt khi cân");
    expect(s.draft?.missing).toEqual([]);
    s = tap(s, "✅ Đúng");

    expect(s.phase).toBe("DANG_HOI_GIA");
    expect(s.draft).toBeUndefined();
    const text = botTextSince(s, mark);
    expect(text).toContain("23,7 triệu");
    expect(text).toContain("Chú lấy tận vườn thì tôi để 14");
    mark = s.chat.length;
  });

  it("SK3 — Thứ Tư 15:00: Năm ghé vườn → 25,0tr, đòi cọc 7,5tr, đứng đầu", () => {
    s = run(
      s,
      { type: "CLOCK_ADVANCED", to: { day: "thu4", time: "15:00" } },
      { type: "FARMER_MESSAGE", voice: true, text: "Có ông Năm ở Cái Bè ghé, mua xô 12 rưỡi, lấy tại vườn, tuần sau trả tiền" },
    );
    s = tap(s, "✅ Đúng");
    const text = botTextSince(s, mark);
    expect(text).toContain("25,0 triệu");
    expect(text).toContain("7.500.000đ");
    expect(s.offers.find((o) => o.id === s.recommendation?.offerId)?.buyer).toBe("Năm");
    mark = s.chat.length;
  });

  it("SK4 — Thứ Tư 17:00: Tư chịu lấy tại vườn → cập nhật 25,2tr, đứng đầu", () => {
    s = run(
      s,
      { type: "CLOCK_ADVANCED", to: { day: "thu4", time: "17:00" } },
      { type: "FARMER_MESSAGE", text: "Gọi lại thằng Tư rồi, nó chịu lấy tại vườn, giữ giá 14" },
    );
    expect(s.draft?.updateOf).toBeDefined();
    s = tap(s, "✅ Đúng");

    expect(netOfBuyer(s, "Tư")).toHaveLength(1);
    expect(s.offers.filter((o) => o.status === "superseded")).toHaveLength(1);
    const text = botTextSince(s, mark);
    expect(text).toContain("Tốt quá bác! Chú Tư giờ là 25,2 triệu.");
    expect(text).toContain("chưa cần chốt vội");
    mark = s.chat.length;
  });

  it("SK5 — Thứ Năm 06:00: mưa → chốt hôm nay → bác bấm chốt với Tư", () => {
    s = run(
      s,
      { type: "CLOCK_ADVANCED", to: { day: "thu5", time: "06:00" } },
      { type: "WEATHER_CHANGED", weather: RAIN_WEATHER },
    );
    expect(s.recommendation?.urgency).toBe("sell_today");
    expect(botTextSince(s, mark)).toContain("Con khuyên bác chốt trong hôm nay");
    // Advisor đã khuyên nhưng phiên vẫn chưa chốt — phải chờ nông dân bấm
    expect(s.phase).toBe("DANG_HOI_GIA");

    s = run(s, { type: "CLOCK_ADVANCED", to: { day: "thu5", time: "06:05" } });
    s = tap(s, "✅ Bác đã chốt với chú Tư");
    expect(s.phase).toBe("DA_CHOT");
    expect(s.agreement).toMatchObject({
      buyer: "Tư",
      pricePerKg: 14_000,
      maxRejectKg: 200,
      delivery: "farm",
      payment: { kind: "cash_on_weigh" },
      savedAt: { day: "thu5", time: "06:05" },
    });
    mark = s.chat.length;
  });

  it("SK6 — Thứ Sáu 09:00: bị chê loại 300kg → cảnh báo; trừ 200, nhận 25,2tr → hoàn tất", () => {
    s = run(
      s,
      { type: "CLOCK_ADVANCED", to: { day: "thu6", time: "09:00" } },
      { type: "FARMER_MESSAGE", voice: true, text: "Nó cân 2 tấn mà chê loại hết 300 ký" },
    );
    expect(s.phase).toBe("DANG_CAN");
    expect(botTextSince(s, mark)).toContain("1.400.000đ");
    mark = s.chat.length;

    s = run(s, { type: "FARMER_MESSAGE", voice: true, text: "Nó chịu trừ 200 rồi, đưa 25 triệu 2" });
    expect(s.phase).toBe("HOAN_TAT");
    const text = botTextSince(s, mark);
    expect(text).toContain("✅ khớp");
    expect(text).toContain("bác được thêm 1,5 triệu");

    const summary = s.chat
      .map((c) => (c.from === "bot" ? c.message.card : undefined))
      .find((card) => card?.type === "summary");
    expect(summary).toMatchObject({ received: 25_200_000, baselineNet: 23_700_000, gain: 1_500_000 });
  });

  it("Guard không chặn lần nào trong suốt kịch bản", () => {
    expect(s.brain.flatMap((b) => b.violations)).toEqual([]);
    expect(s.brain.length).toBeGreaterThanOrEqual(10);
  });
});

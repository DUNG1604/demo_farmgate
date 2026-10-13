import { describe, expect, it } from "vitest";
import { fallbackAdvisor } from "@/advisor/fallbackAdvisor";
import type { Advisor } from "@/advisor/types";
import {
  createInitialSession,
  createSessionReducer,
  type SessionAction,
  type SessionState,
} from "@/domain/session";
import { RAIN_WEATHER } from "@/scenario/data";

const reduce = createSessionReducer(fallbackAdvisor);
const run = (s: SessionState, ...actions: SessionAction[]) => actions.reduce(reduce, s);

/** Phiên đã có 2 chào giá hợp lệ (Tư tại vườn, Năm) — đang ở DANG_HOI_GIA. */
function withTwoOffers(): SessionState {
  return run(
    createInitialSession(),
    { type: "CLOCK_ADVANCED", to: { day: "thu4", time: "08:10" } },
    { type: "FARMER_MESSAGE", text: "Thằng Tư trả 14 nghìn, trừ loại 10%, lấy tại vườn, tiền mặt" },
    { type: "FARMER_CONFIRMED_OFFER" },
    { type: "FARMER_MESSAGE", text: "Có ông Năm ở Cái Bè ghé, mua xô 12 rưỡi, lấy tại vườn, tuần sau trả tiền" },
    { type: "FARMER_CONFIRMED_OFFER" },
  );
}

describe("state machine — chỉ nông dân mới chốt được", () => {
  const base = withTwoOffers();

  it("chuẩn bị: có 2 chào giá, đang hỏi giá", () => {
    expect(base.phase).toBe("DANG_HOI_GIA");
    expect(base.offers).toHaveLength(2);
  });

  it("mọi action khác FARMER_CONFIRMED_DEAL đều không đưa phiên tới DA_CHOT", () => {
    const others: SessionAction[] = [
      { type: "TICK" },
      { type: "CLOCK_ADVANCED", to: { day: "thu5", time: "06:00" } },
      { type: "WEATHER_CHANGED", weather: RAIN_WEATHER },
      { type: "FARMER_MESSAGE", text: "chốt luôn với thằng Tư đi" },
      { type: "FARMER_MESSAGE", text: "bán cho ông Năm" },
      { type: "FARMER_SET_FIELD", patch: { rejectRate: 0 }, label: "x" },
      { type: "FARMER_CONFIRMED_OFFER" },
      { type: "FARMER_EDIT_OFFER" },
      { type: "FARMER_DECLINED_DEAL" },
    ];
    let s = base;
    for (const action of others) {
      s = reduce(s, action);
      expect(s.phase).not.toBe("DA_CHOT");
      expect(s.agreement).toBeUndefined();
    }
  });

  it("advisor cố phát effect chốt → bị bỏ qua", () => {
    const rogue: Advisor = {
      ...fallbackAdvisor,
      respond: (trigger, ctx) => ({
        ...fallbackAdvisor.respond(trigger, ctx),
        effects: [{ type: "confirm_deal", offerId: ctx.offers[0]?.id }],
      }),
    };
    const s = createSessionReducer(rogue)(base, { type: "WEATHER_CHANGED", weather: RAIN_WEATHER });
    expect(s.phase).toBe("DANG_HOI_GIA");
    expect(s.brain.at(-1)?.violations[0]).toContain("tự chốt bán");
  });

  it("FARMER_CONFIRMED_DEAL → DA_CHOT + thỏa thuận", () => {
    const tu = base.offers.find((o) => o.buyer === "Tư")!;
    const s = reduce(base, { type: "FARMER_CONFIRMED_DEAL", offerId: tu.id });
    expect(s.phase).toBe("DA_CHOT");
    expect(s.agreement?.maxRejectKg).toBe(200);
  });

  it("không chốt được với chào giá đã bị thay thế", () => {
    let s = run(base, { type: "FARMER_MESSAGE", text: "Tư nâng lên 14 rưỡi rồi" }, { type: "FARMER_CONFIRMED_OFFER" });
    const old = s.offers.find((o) => o.status === "superseded")!;
    s = reduce(s, { type: "FARMER_CONFIRMED_DEAL", offerId: old.id });
    expect(s.phase).toBe("DANG_HOI_GIA");
  });

  it("không chốt được với chào giá không tồn tại", () => {
    expect(reduce(base, { type: "FARMER_CONFIRMED_DEAL", offerId: "khong-co" }).phase).toBe("DANG_HOI_GIA");
  });
});

describe("thỏa thuận bất biến", () => {
  it("không sửa được sau khi lưu", () => {
    const base = withTwoOffers();
    const tu = base.offers.find((o) => o.buyer === "Tư")!;
    const s = reduce(base, { type: "FARMER_CONFIRMED_DEAL", offerId: tu.id });
    const agreement = s.agreement as unknown as Record<string, unknown>;
    expect(() => {
      agreement.pricePerKg = 10_000;
    }).toThrow();
    expect(() => {
      (agreement.payment as Record<string, unknown>).kind = "deferred";
    }).toThrow();
    expect(s.agreement?.pricePerKg).toBe(14_000);
  });
});

describe("thẻ chào giá chờ xác nhận", () => {
  const start = run(
    createInitialSession(),
    { type: "CLOCK_ADVANCED", to: { day: "thu4", time: "08:10" } },
    { type: "FARMER_MESSAGE", text: "ông Bảy trả 14.000đ" },
  );

  it("thiếu nhiều trường → hỏi lần lượt", () => {
    expect(start.draft?.missing).toEqual(["rejectRate", "delivery", "payment"]);
    expect(start.chips.map((c) => c.label)).toContain("Trừ 10%");
  });

  it("gõ câu trả lời ngắn được gộp vào thẻ", () => {
    const s = run(start, { type: "FARMER_MESSAGE", text: "trừ 5%, lấy tại vườn, tiền mặt" });
    expect(s.draft?.missing).toEqual([]);
    expect(s.draft?.draft).toMatchObject({ buyer: "Bảy", rejectRate: 0.05, delivery: "farm" });
  });

  it("chưa đủ thông tin thì không xác nhận được", () => {
    const s = reduce(start, { type: "FARMER_CONFIRMED_OFFER" });
    expect(s.offers).toHaveLength(0);
  });

  it("bấm Sửa → bỏ thẻ", () => {
    const s = reduce(start, { type: "FARMER_EDIT_OFFER" });
    expect(s.draft).toBeUndefined();
  });

  it("nông dân hành động → nút cũ biến mất", () => {
    const s = reduce(start, { type: "FARMER_MESSAGE", text: "hôm nay trời đẹp" });
    expect(s.chips).toEqual([]);
  });
});

describe("nhật ký & reset", () => {
  it("mỗi lượt có một dòng BrainLog kèm kết quả parse", () => {
    const s = withTwoOffers();
    const first = s.brain[0];
    expect(first.input).toContain("Thằng Tư");
    expect(first.parse?.kind).toBe("offer");
    expect(first.trigger.type).toBe("offer_draft");
  });

  it("đổi giờ → có dòng hệ thống", () => {
    const s = reduce(createInitialSession(), { type: "CLOCK_ADVANCED", to: { day: "thu4", time: "08:10" } });
    expect(s.chat.at(-1)).toMatchObject({ from: "system", text: "— Thứ Tư 08:10 —" });
  });

  it("thời tiết đổi sau khi đã chốt → không khuyên thêm", () => {
    const base = withTwoOffers();
    const tu = base.offers.find((o) => o.buyer === "Tư")!;
    const done = reduce(base, { type: "FARMER_CONFIRMED_DEAL", offerId: tu.id });
    const s = reduce(done, { type: "WEATHER_CHANGED", weather: RAIN_WEATHER });
    expect(s.chat.length).toBe(done.chat.length);
    expect(s.weather).toBe(RAIN_WEATHER);
  });

  it("RESET về trạng thái đầu", () => {
    expect(reduce(withTwoOffers(), { type: "RESET" })).toEqual(createInitialSession());
  });
});

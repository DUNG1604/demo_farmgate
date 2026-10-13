import { describe, expect, it } from "vitest";
import { fallbackAdvisor } from "@/advisor/fallbackAdvisor";
import { chipToAction } from "@/domain/session";
import {
  createDemoReducer,
  createDemoState,
  isFinished,
  pendingFarmerBeat,
  stepStatus,
  totalHoldMs,
  type DemoState,
} from "@/scenario/runner";
import { SCENARIO } from "@/scenario/script";

const reduce = createDemoReducer(fallbackAdvisor);

function summaryOf(state: DemoState) {
  return state.session.chat
    .map((c) => (c.from === "bot" ? c.message.card : undefined))
    .find((card) => card?.type === "summary");
}

describe("kịch bản dạng dữ liệu", () => {
  it("6 sự kiện, đúng giờ", () => {
    expect(SCENARIO.map((s) => `${s.at.day} ${s.at.time}`)).toEqual([
      "thu3 07:00",
      "thu4 08:10",
      "thu4 15:00",
      "thu4 17:00",
      "thu5 06:00",
      "thu6 09:00",
    ]);
  });

  it("tổng thời gian tự chạy 80–100 giây", () => {
    const ms = totalHoldMs(createDemoState());
    expect(ms).toBeGreaterThanOrEqual(80_000);
    expect(ms).toBeLessThanOrEqual(100_000);
  });
});

describe("tự chạy (AUTO_BEAT)", () => {
  it("chạy hết kịch bản → kết quả giống e2e T5", () => {
    let s = createDemoState();
    let guard = 0;
    while (!isFinished(s) && guard++ < 100) {
      s = reduce(s, { type: "AUTO_BEAT" });
      expect(s.error).toBeUndefined();
    }
    expect(isFinished(s)).toBe(true);
    expect(s.session.phase).toBe("HOAN_TAT");
    expect(summaryOf(s)).toMatchObject({ received: 25_200_000, baselineNet: 23_700_000, gain: 1_500_000 });
    expect(s.session.agreement?.savedAt).toEqual({ day: "thu5", time: "06:05" });
    expect(s.session.brain.flatMap((b) => b.violations)).toEqual([]);
    expect(SCENARIO.every((step) => stepStatus(s, step.id) === "done")).toBe(true);
  });
});

describe("chạy tay", () => {
  it("Bước tiếp chạy nhịp thế giới rồi dừng chờ bác Ba", () => {
    let s = reduce(createDemoState(), { type: "NEXT_STEP" });
    // SK1 không có lượt bác Ba → chạy hết, con trỏ sang đầu SK2
    expect(stepStatus(s, 1)).toBe("done");
    expect(stepStatus(s, 2)).toBe("pending");
    expect(s.session.chat.some((c) => c.from === "bot")).toBe(true);

    s = reduce(s, { type: "NEXT_STEP" });
    expect(stepStatus(s, 2)).toBe("active");
    expect(pendingFarmerBeat(s)?.beat).toMatchObject({ kind: "say" });

    // Đang chờ bác Ba → Bước tiếp không làm gì
    expect(reduce(s, { type: "NEXT_STEP" })).toBe(s);
  });

  it("🎤 gửi câu nói, bác tự bấm chip → con trỏ đi tiếp", () => {
    let s = reduce(reduce(createDemoState(), { type: "NEXT_STEP" }), { type: "NEXT_STEP" });
    s = reduce(s, { type: "FARMER_BEAT" });
    expect(s.session.chat.some((c) => c.from === "farmer" && c.voice)).toBe(true);
    expect(pendingFarmerBeat(s)?.beat).toMatchObject({ kind: "tap", label: "Tiền mặt khi cân" });

    for (const label of ["Tiền mặt khi cân", "✅ Đúng"]) {
      const chip = s.session.chips.find((c) => c.label.startsWith(label))!;
      s = reduce(s, { type: "SESSION", action: chipToAction(chip) });
    }
    expect(stepStatus(s, 2)).toBe("done");
    expect(s.session.offers).toHaveLength(1);
  });

  it("bác làm khác kịch bản → phiên vẫn chạy, con trỏ đứng yên", () => {
    let s = reduce(reduce(createDemoState(), { type: "NEXT_STEP" }), { type: "NEXT_STEP" });
    const before = s.cursor;
    s = reduce(s, { type: "SESSION", action: { type: "FARMER_MESSAGE", text: "ông Bảy trả 13 rưỡi" } });
    expect(s.cursor).toBe(before);
    expect(s.session.draft?.draft.buyer).toBe("Bảy");
  });

  it("nhịp bấm nút không thấy chip → báo lỗi, không đi tiếp", () => {
    let s = reduce(reduce(createDemoState(), { type: "NEXT_STEP" }), { type: "NEXT_STEP" });
    s = reduce(s, { type: "FARMER_BEAT" });
    s = reduce(s, { type: "SESSION", action: { type: "FARMER_MESSAGE", text: "hôm nay trời đẹp" } }); // làm mất chip
    const cursor = s.cursor;
    s = reduce(s, { type: "AUTO_BEAT" });
    expect(s.error).toContain("Tiền mặt khi cân");
    expect(s.cursor).toBe(cursor);
  });

  it("RESET về đầu", () => {
    const s = reduce(reduce(createDemoState(), { type: "NEXT_STEP" }), { type: "RESET" });
    expect(s).toEqual(createDemoState());
  });
});

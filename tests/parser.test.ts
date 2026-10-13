import { describe, expect, it } from "vitest";
import { parseMessage } from "@/advisor/fallback/parser";
import type { ParseContext } from "@/advisor/types";

const fresh: ParseContext = { regularBuyers: ["Tư"], knownBuyers: [], stage: "offers" };
const withTuNam: ParseContext = {
  regularBuyers: ["Tư"],
  knownBuyers: ["Tư", "Năm"],
  lastBuyer: "Năm",
  stage: "offers",
};
const weighing: ParseContext = { regularBuyers: ["Tư"], knownBuyers: ["Tư", "Năm"], stage: "weighing" };

describe("5 câu nói trong kịch bản", () => {
  it("Sự kiện 2 — Tư gọi (thiếu trả tiền)", () => {
    expect(
      parseMessage("Thằng Tư mới gọi, trả 14 nghìn, trừ loại 10 phần trăm, bắt mình chở ra kho Tân Hương", fresh),
    ).toEqual({
      kind: "offer",
      draft: { buyer: "Tư", isRegular: true, pricePerKg: 14_000, rejectRate: 0.1, delivery: "depot" },
      missing: ["payment"],
    });
  });

  it("Sự kiện 3 — Năm ghé vườn", () => {
    expect(
      parseMessage("Có ông Năm ở Cái Bè ghé, mua xô 12 rưỡi, lấy tại vườn, tuần sau trả tiền", {
        ...fresh,
        knownBuyers: ["Tư"],
      }),
    ).toEqual({
      kind: "offer",
      draft: {
        buyer: "Năm",
        buyerOrigin: "Cái Bè",
        isRegular: false,
        pricePerKg: 12_500,
        rejectRate: 0,
        delivery: "farm",
        payment: { kind: "deferred", days: 7 },
      },
      missing: [],
    });
  });

  it("Sự kiện 4 — Tư chịu lấy tại vườn (cập nhật)", () => {
    expect(parseMessage("Gọi lại thằng Tư rồi, nó chịu lấy tại vườn, giữ giá 14", withTuNam)).toEqual({
      kind: "offer_update",
      buyer: "Tư",
      patch: { pricePerKg: 14_000, delivery: "farm" },
    });
  });

  it("Sự kiện 6a — cân, bị chê loại 300 ký", () => {
    expect(parseMessage("Nó cân 2 tấn mà chê loại hết 300 ký", weighing)).toEqual({
      kind: "weigh",
      report: { totalKg: 2_000, rejectKg: 300 },
    });
  });

  it("Sự kiện 6b — chịu trừ 200, đưa 25 triệu 2", () => {
    expect(parseMessage("Nó chịu trừ 200 rồi, đưa 25 triệu 2", weighing)).toEqual({
      kind: "weigh",
      report: { rejectKg: 200, cashReceived: 25_200_000 },
    });
  });
});

describe("cách nói biến thể", () => {
  it("chú Sáu ở Mỹ Tho, 13 rưỡi, tiền mặt, tận vườn, trừ 5%", () => {
    expect(
      parseMessage("Chú Sáu ở Mỹ Tho trả 13 rưỡi, tiền mặt, lấy tận vườn, trừ 5%", fresh),
    ).toEqual({
      kind: "offer",
      draft: {
        buyer: "Sáu",
        buyerOrigin: "Mỹ Tho",
        isRegular: false,
        pricePerKg: 13_500,
        rejectRate: 0.05,
        delivery: "farm",
        payment: { kind: "cash_on_weigh" },
      },
      missing: [],
    });
  });

  it("14k, giá xô, ra kho, 10 ngày sau trả", () => {
    const r = parseMessage("anh Hai trả 14k giá xô, ra kho, 10 ngày sau trả", fresh);
    expect(r).toMatchObject({
      kind: "offer",
      draft: {
        buyer: "Hai",
        pricePerKg: 14_000,
        rejectRate: 0,
        delivery: "depot",
        payment: { kind: "deferred", days: 10 },
      },
      missing: [],
    });
  });

  it("14.000đ — thiếu các trường còn lại", () => {
    expect(parseMessage("ông Bảy trả 14.000đ", fresh)).toEqual({
      kind: "offer",
      draft: { buyer: "Bảy", isRegular: false, pricePerKg: 14_000 },
      missing: ["rejectRate", "delivery", "payment"],
    });
  });

  it("15 ngàn rưỡi, trả liền", () => {
    expect(parseMessage("Thằng Tư trả 15 ngàn rưỡi, trả liền", fresh)).toMatchObject({
      draft: { pricePerKg: 15_500, payment: { kind: "cash_on_weigh" } },
    });
  });

  it("14 nghìn 2 → 14.200, chưa có tên người mua", () => {
    expect(parseMessage("có người trả 14 nghìn 2", fresh)).toMatchObject({
      kind: "offer",
      draft: { pricePerKg: 14_200 },
      missing: ["buyer", "rejectRate", "delivery", "payment"],
    });
  });

  it("gõ không dấu", () => {
    expect(parseMessage("ong Nam tra 12 ruoi, lay tai vuon, tien mat", fresh)).toMatchObject({
      kind: "offer",
      draft: {
        buyer: "Nam",
        pricePerKg: 12_500,
        delivery: "farm",
        payment: { kind: "cash_on_weigh" },
      },
      missing: ["rejectRate"],
    });
  });

  it("nói cả kho lẫn vườn → lấy ý sau cùng", () => {
    expect(
      parseMessage("chú Sáu trả 14 nghìn, khỏi chở ra kho, lấy tại vườn luôn", fresh),
    ).toMatchObject({ draft: { delivery: "farm" } });
  });

  it("'trả sau' không nói bao lâu → không đoán, để thiếu", () => {
    expect(parseMessage("ông Bảy trả 14 nghìn, trả sau", fresh)).toMatchObject({
      missing: expect.arrayContaining(["payment"]),
    });
  });

  it("người đã có chào giá nâng giá → cập nhật", () => {
    expect(parseMessage("Tư nâng lên 14 rưỡi rồi", withTuNam)).toEqual({
      kind: "offer_update",
      buyer: "Tư",
      patch: { pricePerKg: 14_500 },
    });
  });

  it("'nó' → người được nhắc gần nhất", () => {
    expect(parseMessage("nó chịu trả tiền mặt rồi", withTuNam)).toEqual({
      kind: "offer_update",
      buyer: "Năm",
      patch: { payment: { kind: "cash_on_weigh" } },
    });
  });

  it("cân theo tạ và ký", () => {
    expect(parseMessage("cân được 3 tạ, chê loại 20 ký", weighing)).toEqual({
      kind: "weigh",
      report: { totalKg: 300, rejectKg: 20 },
    });
  });

  it("nhận tiền dạng 25,2 triệu", () => {
    expect(parseMessage("nó đưa 25,2 triệu", weighing)).toEqual({
      kind: "weigh",
      report: { cashReceived: 25_200_000 },
    });
  });
});

describe("đang có thẻ chào giá chờ bổ sung", () => {
  const pending = { ...fresh, pendingDraft: { buyer: "Tư", isRegular: true, pricePerKg: 14_000, rejectRate: 0.1, delivery: "depot" as const } };

  it("'tiền mặt' → gộp vào thẻ, đủ thông tin", () => {
    expect(parseMessage("tiền mặt", pending)).toEqual({
      kind: "offer",
      draft: { ...pending.pendingDraft, payment: { kind: "cash_on_weigh" } },
      missing: [],
    });
  });

  it("nói chào giá của người khác → thẻ mới, không gộp", () => {
    expect(parseMessage("ông Năm trả 12 rưỡi", pending)).toMatchObject({
      kind: "offer",
      draft: { buyer: "Năm", pricePerKg: 12_500 },
    });
  });
});

describe("không hiểu thì không đoán", () => {
  it.each(["hôm nay trời đẹp quá", "con ăn cơm chưa", "ừ"])("%s → unknown", (text) => {
    expect(parseMessage(text, fresh)).toEqual({ kind: "unknown" });
  });

  it("đang cân mà nói chuyện khác → unknown", () => {
    expect(parseMessage("để bác nghĩ đã", weighing)).toEqual({ kind: "unknown" });
  });

  it("nhắc người đã biết nhưng không có thông tin mới → unknown", () => {
    expect(parseMessage("thằng Tư hả", withTuNam)).toEqual({ kind: "unknown" });
  });
});

// Tái hiện bảng số liệu ở claude/01-kich-ban.md §4 — 7 dòng.
import { describe, expect, it } from "vitest";
import { calculateGain, calculateNet, suggestedDeposit } from "@/domain/netCalculator";
import { checkWeigh } from "@/domain/weighCheck";
import type { Agreement } from "@/domain/types";
import { DEPOSIT_RATE, FARMER_PROFILE } from "@/scenario/data";

const tuDepot = { pricePerKg: 14_000, rejectRate: 0.1, delivery: "depot" as const };
const nam = { pricePerKg: 12_500, rejectRate: 0, delivery: "farm" as const };
const tuFarm = { pricePerKg: 14_000, rejectRate: 0.1, delivery: "farm" as const };

const agreement: Agreement = {
  offerId: "tu",
  buyer: "Tư",
  pricePerKg: 14_000,
  totalKg: 2_000,
  maxRejectKg: 200,
  delivery: "farm",
  payment: { kind: "cash_on_weigh" },
  savedAt: { day: "thu5", time: "06:05" },
};

describe("bảng số liệu kịch bản", () => {
  it("1. Tư lần 1 (chở ra kho) = 23.700.000", () => {
    const r = calculateNet(tuDepot, FARMER_PROFILE);
    expect(r.billableKg).toBe(1_800);
    expect(r.gross).toBe(25_200_000);
    expect(r.transportCost).toBe(1_500_000);
    expect(r.net).toBe(23_700_000);
  });

  it("2. Năm (xô, tại vườn) = 25.000.000", () => {
    expect(calculateNet(nam, FARMER_PROFILE).net).toBe(25_000_000);
  });

  it("3. Cọc đề xuất cho Năm = 7.500.000", () => {
    const net = calculateNet(nam, FARMER_PROFILE).net;
    expect(suggestedDeposit(net, DEPOSIT_RATE)).toBe(7_500_000);
  });

  it("4. Tư lần 2 (tại vườn) = 25.200.000", () => {
    const r = calculateNet(tuFarm, FARMER_PROFILE);
    expect(r.transportCost).toBe(0);
    expect(r.net).toBe(25_200_000);
  });

  it("5. Thiệt nếu trừ 300kg = 1.400.000", () => {
    const r = checkWeigh(agreement, { totalKg: 2_000, rejectKg: 300 });
    expect(r.allowedRejectKg).toBe(200);
    expect(r.excessKg).toBe(100);
    expect(r.loss).toBe(1_400_000);
    expect(r.cashMatches).toBeUndefined();
  });

  it("6. Tiền nhận cuối = 25.200.000 và khớp", () => {
    const r = checkWeigh(agreement, { totalKg: 2_000, rejectKg: 200, cashReceived: 25_200_000 });
    expect(r.excessKg).toBe(0);
    expect(r.loss).toBe(0);
    expect(r.expectedCash).toBe(25_200_000);
    expect(r.cashMatches).toBe(true);
  });

  it("7. Được thêm so với chào giá đầu = 1.500.000", () => {
    const first = calculateNet(tuDepot, FARMER_PROFILE).net;
    expect(calculateGain(first, 25_200_000)).toBe(1_500_000);
  });
});

describe("các dòng phép tính hiển thị", () => {
  it("Tư lần 1", () => {
    expect(calculateNet(tuDepot, FARMER_PROFILE).lines).toEqual([
      "2.000 kg trừ loại 10% → 1.800 kg tính tiền",
      "1.800 kg × 14.000đ = 25.200.000đ",
      "Trừ xe chở ra kho Tân Hương: −1.500.000đ",
      "Thực nhận: 23.700.000đ",
    ]);
  });

  it("Năm (mua xô)", () => {
    expect(calculateNet(nam, FARMER_PROFILE).lines).toEqual([
      "2.000 kg tính tiền (không trừ loại)",
      "2.000 kg × 12.500đ = 25.000.000đ",
      "Thực nhận: 25.000.000đ",
    ]);
  });
});

describe("trường hợp biên", () => {
  it("tiền nhận không khớp", () => {
    const r = checkWeigh(agreement, { totalKg: 2_000, rejectKg: 200, cashReceived: 25_000_000 });
    expect(r.cashMatches).toBe(false);
  });

  it("cọc làm tròn xuống 100.000đ", () => {
    expect(suggestedDeposit(23_750_000, 0.3)).toBe(7_100_000);
  });

  it("kết quả luôn là số nguyên", () => {
    const r = calculateNet({ pricePerKg: 13_500, rejectRate: 0.07, delivery: "farm" }, FARMER_PROFILE);
    expect(Number.isInteger(r.billableKg)).toBe(true);
    expect(Number.isInteger(r.net)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  dayLabel,
  formatKg,
  formatMillion,
  formatPercent,
  formatSimTime,
  formatVnd,
} from "@/lib/format";
import { compareSimTime, daysBetween } from "@/domain/time";
import { FARMER_PROFILE } from "@/scenario/data";

describe("formatVnd", () => {
  it.each([
    [25_200_000, "25.200.000đ"],
    [1_400_000, "1.400.000đ"],
    [14_000, "14.000đ"],
    [0, "0đ"],
  ])("%d → %s", (amount, expected) => {
    expect(formatVnd(amount)).toBe(expected);
  });
});

describe("formatMillion", () => {
  it.each([
    [25_200_000, "25,2 triệu"],
    [25_000_000, "25,0 triệu"],
    [23_700_000, "23,7 triệu"],
    [1_500_000, "1,5 triệu"],
    [7_500_000, "7,5 triệu"],
  ])("%d → %s", (amount, expected) => {
    expect(formatMillion(amount)).toBe(expected);
  });
});

describe("định dạng khác", () => {
  it("kg và phần trăm", () => {
    expect(formatKg(2_000)).toBe("2.000 kg");
    expect(formatPercent(0.1)).toBe("10%");
    expect(formatPercent(0)).toBe("0%");
  });

  it("tên thứ và thời điểm", () => {
    expect(dayLabel("thu4")).toBe("Thứ Tư");
    expect(dayLabel("cn")).toBe("Chủ nhật");
    expect(formatSimTime({ day: "thu4", time: "08:10" })).toBe("Thứ Tư 08:10");
  });
});

describe("thời gian giả lập", () => {
  it("so sánh thời điểm", () => {
    expect(compareSimTime({ day: "thu4", time: "08:10" }, { day: "thu4", time: "15:00" })).toBeLessThan(0);
    expect(compareSimTime({ day: "thu5", time: "06:00" }, { day: "thu4", time: "17:00" })).toBeGreaterThan(0);
    expect(compareSimTime({ day: "thu3", time: "07:00" }, { day: "thu3", time: "07:00" })).toBe(0);
  });

  it("Thứ Ba còn 3 ngày tới thu hoạch Thứ Sáu", () => {
    expect(daysBetween("thu3", FARMER_PROFILE.harvestDay)).toBe(3);
  });
});

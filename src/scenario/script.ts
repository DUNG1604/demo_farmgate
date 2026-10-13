// 6 sự kiện của claude/01-kich-ban.md dưới dạng dữ liệu.
// Mỗi sự kiện là một chuỗi "nhịp" (beat) chạy theo thứ tự:
//   - nhịp thế giới: clock / weather / tick — runner tự chạy
//   - nhịp nông dân: say / tap — tự chạy khi auto-play, chờ người bấm khi chạy tay
import type { SimTime, Weather } from "@/domain/types";
import { RAIN_WEATHER } from "./data";

export type Beat =
  | { kind: "clock"; to: SimTime }
  | { kind: "weather"; weather: Weather }
  /** FarmGate chủ động lên tiếng */
  | { kind: "tick" }
  | { kind: "say"; text: string; voice: boolean }
  /** Bấm chip có nhãn bắt đầu bằng `label` */
  | { kind: "tap"; label: string };

export type TimedBeat = Beat & {
  /** Thời gian dừng sau nhịp này khi auto-play (ms) — để người xem kịp đọc */
  holdMs: number;
};

export interface ScenarioStep {
  id: number;
  at: SimTime;
  title: string;
  /** Gợi ý cho người trình diễn khi đến lượt bác Ba (chạy tay) */
  hint?: string;
  beats: TimedBeat[];
}

const CLOCK_MS = 1_500;
const SAY_MS = 7_000;
const TAP_MS = 5_000;

const clock = (to: SimTime): TimedBeat => ({ kind: "clock", to, holdMs: CLOCK_MS });
const say = (text: string, voice = true, holdMs = SAY_MS): TimedBeat => ({ kind: "say", text, voice, holdMs });
const tap = (label: string, holdMs = TAP_MS): TimedBeat => ({ kind: "tap", label, holdMs });

export const SCENARIO: ScenarioStep[] = [
  {
    id: 1,
    at: { day: "thu3", time: "07:00" },
    title: "FarmGate nhắc sắp thu hoạch",
    beats: [clock({ day: "thu3", time: "07:00" }), { kind: "tick", holdMs: 6_000 }],
  },
  {
    id: 2,
    at: { day: "thu4", time: "08:10" },
    title: "Mối quen Tư gọi điện báo giá",
    hint: "Bấm 🎤 để gửi tin thoại của bác Ba, rồi trả lời câu hỏi của FarmGate",
    beats: [
      clock({ day: "thu4", time: "08:10" }),
      say("Thằng Tư mới gọi, trả 14 nghìn, trừ loại 10 phần trăm, bắt mình chở ra kho Tân Hương"),
      tap("Tiền mặt khi cân", 4_000),
      tap("✅ Đúng", 8_000),
    ],
  },
  {
    id: 3,
    at: { day: "thu4", time: "15:00" },
    title: "Người lạ (Năm) ghé vườn",
    hint: "Bấm 🎤 rồi xác nhận thẻ chào giá",
    beats: [
      clock({ day: "thu4", time: "15:00" }),
      say("Có ông Năm ở Cái Bè ghé, mua xô 12 rưỡi, lấy tại vườn, tuần sau trả tiền"),
      tap("✅ Đúng", 9_000),
    ],
  },
  {
    id: 4,
    at: { day: "thu4", time: "17:00" },
    title: "Tư chịu lấy tại vườn",
    hint: "Bấm 🎤 rồi xác nhận cập nhật",
    beats: [
      clock({ day: "thu4", time: "17:00" }),
      say("Gọi lại thằng Tư rồi, nó chịu lấy tại vườn, giữ giá 14", false, 5_000),
      tap("✅ Đúng", 7_000),
    ],
  },
  {
    id: 5,
    at: { day: "thu5", time: "06:00" },
    title: "Dự báo mưa — FarmGate đổi khuyến nghị",
    hint: "Bác Ba gọi điện chốt với Tư, rồi bấm nút xác nhận đã chốt",
    beats: [
      clock({ day: "thu5", time: "06:00" }),
      { kind: "weather", weather: RAIN_WEATHER, holdMs: 9_000 },
      clock({ day: "thu5", time: "06:05" }),
      tap("✅ Bác đã chốt với", 6_000),
    ],
  },
  {
    id: 6,
    at: { day: "thu6", time: "09:00" },
    title: "Cân hàng — kiểm tra thỏa thuận",
    hint: "Bấm 🎤 để báo kết quả cân",
    beats: [
      clock({ day: "thu6", time: "09:00" }),
      say("Nó cân 2 tấn mà chê loại hết 300 ký", true, 8_000),
      say("Nó chịu trừ 200 rồi, đưa 25 triệu 2", true, 9_000),
    ],
  },
];

export function isFarmerBeat(beat: Beat): beat is Extract<Beat, { kind: "say" | "tap" }> {
  return beat.kind === "say" || beat.kind === "tap";
}

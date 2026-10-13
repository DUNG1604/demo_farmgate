// Runner kịch bản: bọc reducer phiên, giữ con trỏ "đang ở nhịp nào" của SCENARIO.
// UI (T8) dùng createDemoReducer với useReducer; hẹn giờ auto-play do UI lo, dựa vào `holdMs` của nhịp.
//
// Chạy tay:  NEXT_STEP chạy các nhịp thế giới của sự kiện hiện tại, dừng ở lượt bác Ba.
//            FARMER_BEAT (nút 🎤) gửi câu nói đang chờ. Bác Ba tự bấm chip → SESSION; nếu khớp
//            nhịp đang chờ thì con trỏ đi tiếp.
// Tự chạy:   AUTO_BEAT chạy đúng 1 nhịp bất kỳ (kể cả nói/bấm thay bác Ba).
import type { Advisor } from "@/advisor/types";
import {
  chipToAction,
  createInitialSession,
  createSessionReducer,
  type SessionAction,
  type SessionState,
} from "@/domain/session";
import { isFarmerBeat, SCENARIO, type ScenarioStep, type TimedBeat } from "./script";

export interface PlacedBeat {
  beat: TimedBeat;
  stepId: number;
}

export interface DemoState {
  session: SessionState;
  /** Chỉ số nhịp kế tiếp sẽ chạy trong `beats` */
  cursor: number;
  beats: PlacedBeat[];
  /** Lỗi khi nhịp tự chạy không thực hiện được (vd không thấy chip) */
  error?: string;
}

export type DemoAction =
  | { type: "NEXT_STEP" }
  | { type: "FARMER_BEAT" }
  | { type: "AUTO_BEAT" }
  /** Hành động bác Ba tự làm trên điện thoại (gõ chữ, bấm chip) */
  | { type: "SESSION"; action: SessionAction }
  | { type: "RESET" };

export type StepStatus = "done" | "active" | "pending";

export function flattenScript(script: ScenarioStep[]): PlacedBeat[] {
  return script.flatMap((step) => step.beats.map((beat) => ({ beat, stepId: step.id })));
}

export function createDemoState(script: ScenarioStep[] = SCENARIO): DemoState {
  return { session: createInitialSession(), cursor: 0, beats: flattenScript(script) };
}

// ---------- Truy vấn cho UI ----------

export function currentBeat(state: DemoState): PlacedBeat | undefined {
  return state.beats[state.cursor];
}

/** Nhịp của bác Ba đang chờ (nếu con trỏ đang đứng ở đó). */
export function pendingFarmerBeat(state: DemoState): PlacedBeat | undefined {
  const placed = currentBeat(state);
  return placed && isFarmerBeat(placed.beat) ? placed : undefined;
}

export function isFinished(state: DemoState): boolean {
  return state.cursor >= state.beats.length;
}

export function stepStatus(state: DemoState, stepId: number): StepStatus {
  const indices = state.beats.flatMap((p, i) => (p.stepId === stepId ? [i] : []));
  if (indices.length === 0 || state.cursor > indices[indices.length - 1]) return "done";
  return state.cursor > indices[0] ? "active" : "pending";
}

/** Tổng thời gian auto-play (ms) — mục tiêu ~90 giây. */
export function totalHoldMs(state: DemoState): number {
  return state.beats.reduce((sum, p) => sum + p.beat.holdMs, 0);
}

// ---------- Reducer ----------

export function createDemoReducer(advisor: Advisor) {
  const sessionReducer = createSessionReducer(advisor);

  /** Chuyển một nhịp thành action của phiên. Trả lỗi nếu không làm được. */
  function beatAction(session: SessionState, beat: TimedBeat): SessionAction | string {
    switch (beat.kind) {
      case "clock":
        return { type: "CLOCK_ADVANCED", to: beat.to };
      case "weather":
        return { type: "WEATHER_CHANGED", weather: beat.weather };
      case "tick":
        return { type: "TICK" };
      case "say":
        return { type: "FARMER_MESSAGE", text: beat.text, voice: beat.voice };
      case "tap": {
        const chip = session.chips.find((c) => c.label.startsWith(beat.label));
        return chip
          ? chipToAction(chip)
          : `Không thấy nút "${beat.label}" (đang có: ${session.chips.map((c) => c.label).join(" | ") || "không có"})`;
      }
    }
  }

  function runBeat(state: DemoState): DemoState {
    const placed = currentBeat(state);
    if (!placed) return state;
    const action = beatAction(state.session, placed.beat);
    if (typeof action === "string") return { ...state, error: action };
    return { ...state, session: sessionReducer(state.session, action), cursor: state.cursor + 1, error: undefined };
  }

  /** Chạy các nhịp thế giới liên tiếp trong cùng sự kiện, dừng ở lượt bác Ba hoặc hết sự kiện. */
  function runWorldBeats(state: DemoState, stepId: number): DemoState {
    let next = state;
    for (let p = currentBeat(next); p && p.stepId === stepId && !isFarmerBeat(p.beat); p = currentBeat(next)) {
      next = runBeat(next);
      if (next.error) break;
    }
    return next;
  }

  /** Hành động tay của bác Ba có trùng nhịp đang chờ không. */
  function matchesPending(state: DemoState, action: SessionAction): boolean {
    const beat = pendingFarmerBeat(state)?.beat;
    if (beat?.kind === "say") return action.type === "FARMER_MESSAGE" && action.text === beat.text;
    if (beat?.kind === "tap") {
      return "label" in action && typeof action.label === "string" && action.label.startsWith(beat.label);
    }
    return false;
  }

  return function demoReducer(state: DemoState, action: DemoAction): DemoState {
    switch (action.type) {
      case "RESET":
        return createDemoState(SCENARIO);

      case "NEXT_STEP": {
        const placed = currentBeat(state);
        if (!placed || isFarmerBeat(placed.beat)) return state; // đang chờ bác Ba
        return runWorldBeats(state, placed.stepId);
      }

      case "FARMER_BEAT": {
        const placed = pendingFarmerBeat(state);
        if (!placed || placed.beat.kind !== "say") return state;
        const next = runBeat(state);
        return next.error ? next : runWorldBeats(next, placed.stepId);
      }

      case "AUTO_BEAT":
        return runBeat(state);

      case "SESSION": {
        const placed = pendingFarmerBeat(state);
        const matched = matchesPending(state, action.action);
        const next = { ...state, session: sessionReducer(state.session, action.action), error: undefined };
        if (!matched || !placed) return next;
        return runWorldBeats({ ...next, cursor: next.cursor + 1 }, placed.stepId);
      }
    }
  };
}

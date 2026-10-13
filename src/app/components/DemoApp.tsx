"use client";

import { useEffect, useReducer, useState } from "react";
import { fallbackAdvisor } from "@/advisor/fallbackAdvisor";
import { chipToAction } from "@/domain/session";
import {
  createDemoReducer,
  createDemoState,
  currentBeat,
  isFinished,
  pendingFarmerBeat,
  totalHoldMs,
} from "@/scenario/runner";
import { SCENARIO } from "@/scenario/script";
import { BrainLog } from "./control/BrainLog";
import { OffersTable } from "./control/OffersTable";
import { Timeline } from "./control/Timeline";
import {
  ChatHeader,
  ChatList,
  InputBar,
  PhoneFrame,
  QuickReplies,
  StatusBar,
  useRevealedChat,
} from "./phone/Phone";

const demoReducer = createDemoReducer(fallbackAdvisor);
/** Chờ trước nhịp đầu tiên khi bấm Tự chạy */
const FIRST_BEAT_DELAY_MS = 400;

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-white p-4 shadow-sm ${className}`}>
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">{title}</h2>
      {children}
    </section>
  );
}

export default function DemoApp() {
  const [demo, dispatch] = useReducer(demoReducer, undefined, () => createDemoState());
  const [playing, setPlaying] = useState(false);
  const { session } = demo;
  const chat = useRevealedChat(session.chat);

  const finished = isFinished(demo);
  const autoRunning = playing && !finished && !demo.error;

  // Tự chạy: sau mỗi nhịp, chờ đúng holdMs của nhịp vừa chạy rồi chạy nhịp kế
  useEffect(() => {
    if (!autoRunning) return;
    const delay = demo.cursor === 0 ? FIRST_BEAT_DELAY_MS : demo.beats[demo.cursor - 1].beat.holdMs;
    const timer = setTimeout(() => dispatch({ type: "AUTO_BEAT" }), delay);
    return () => clearTimeout(timer);
  }, [autoRunning, demo.cursor, demo.beats]);

  const pending = pendingFarmerBeat(demo);
  const voiceText = pending?.beat.kind === "say" ? pending.beat.text : undefined;
  const step = SCENARIO.find((s) => s.id === currentBeat(demo)?.stepId);
  const waitingHint = pending && !autoRunning ? step?.hint : undefined;

  const reset = () => {
    setPlaying(false);
    dispatch({ type: "RESET" });
  };
  const togglePlay = () => {
    if (finished) {
      dispatch({ type: "RESET" });
      setPlaying(true);
    } else {
      setPlaying((p) => !p);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center gap-6 p-4 lg:h-dvh lg:flex-row lg:items-start lg:justify-center lg:overflow-hidden lg:p-6">
      <PhoneFrame>
        <StatusBar now={session.now} weather={session.weather} />
        <ChatHeader now={session.now} />
        <ChatList chat={chat.visible} typing={chat.typing} depotName={session.profile.depotName} />
        <QuickReplies
          chips={chat.typing ? [] : session.chips}
          onTap={(chip) => dispatch({ type: "SESSION", action: chipToAction(chip) })}
        />
        <InputBar
          voiceText={voiceText}
          onVoice={() => dispatch({ type: "FARMER_BEAT" })}
          onSend={(text) => dispatch({ type: "SESSION", action: { type: "FARMER_MESSAGE", text } })}
        />
      </PhoneFrame>

      {/* Màn rộng: cột phải cuộn riêng, điện thoại đứng yên */}
      <div className="flex w-full max-w-2xl flex-col gap-4 lg:h-full lg:overflow-y-auto lg:pb-6">
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-green-800">🌾 FarmGate AI v2 — Demo</h1>
              <p className="text-xs text-zinc-500">Bảng điều khiển cho người trình diễn · không hiện trên điện thoại</p>
            </div>
            <div className="flex rounded-full bg-zinc-100 p-1 text-xs font-medium" role="radiogroup" aria-label="Chế độ AI">
              <span role="radio" aria-checked className="rounded-full bg-white px-3 py-1 text-green-800 shadow-sm">
                ● Fallback
              </span>
              <span
                role="radio"
                aria-checked={false}
                aria-disabled
                title="Chưa cấu hình API key"
                className="cursor-not-allowed px-3 py-1 text-zinc-400"
              >
                ○ OpenAI 🔒
              </span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => dispatch({ type: "NEXT_STEP" })}
              disabled={!!pending || finished || autoRunning}
              className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white disabled:bg-zinc-300"
            >
              ▶ Bước tiếp
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className="rounded-lg bg-sky-600 px-4 py-2 font-medium text-white"
            >
              {autoRunning ? "⏸ Tạm dừng" : finished ? "⏯ Chạy lại từ đầu" : "⏯ Tự chạy"}
            </button>
            <button type="button" onClick={reset} className="rounded-lg border px-4 py-2 font-medium">
              🔄 Reset
            </button>
            <span className="self-center text-xs text-zinc-500">
              Tự chạy ≈ {Math.round(totalHoldMs(demo) / 1000)} giây
            </span>
          </div>
          {demo.error && <p className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">⚠️ {demo.error}</p>}
          {finished && <p className="mt-2 text-sm font-medium text-green-700">✅ Đã chạy hết kịch bản</p>}
        </section>

        <Panel title="① Dòng thời gian">
          <Timeline demo={demo} waitingHint={waitingHint} />
        </Panel>

        <Panel title="② Bảng so sánh chào giá (tiền thực nhận do code tính)">
          <OffersTable session={session} />
        </Panel>

        <Panel title="③ Bộ não — AI/luật làm gì, code tính gì">
          <BrainLog entries={session.brain} />
        </Panel>
      </div>
    </div>
  );
}

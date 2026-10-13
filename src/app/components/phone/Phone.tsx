"use client";

import { useEffect, useRef, useState } from "react";
import type { Chip } from "@/advisor/types";
import type { ChatItem } from "@/domain/session";
import type { SimTime, Weather } from "@/domain/types";
import { dayLabel } from "@/lib/format";
import { BotCardView } from "../cards/Cards";

// ---------- Khung ----------

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-[844px] max-h-[calc(100dvh-2rem)] w-[390px] max-w-full shrink-0 rounded-[3rem] border-[10px] border-zinc-900 bg-zinc-900 shadow-2xl">
      <div className="absolute left-1/2 top-0 z-10 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-zinc-900" />
      <div className="flex h-full flex-col overflow-hidden rounded-[2.3rem] bg-[#e2e9f1]">{children}</div>
    </div>
  );
}

/** Giờ bên trái, thời tiết bên phải — để trống phần giữa cho "tai thỏ" trên màn hẹp. */
export function StatusBar({ now, weather }: { now: SimTime; weather: Weather }) {
  return (
    <div className="flex items-center justify-between bg-white px-6 pb-1 pt-2 text-xs font-semibold text-zinc-800">
      <span className="tabular-nums">{now.time}</span>
      <span title={weather.rainForecast ? "Có dự báo mưa" : "Trời nắng"}>
        {weather.now === "rain" ? "🌧️" : "☀️"}
        {weather.rainForecast && <span className="ml-1">→ 🌧️</span>}
      </span>
    </div>
  );
}

export function ChatHeader({ now }: { now: SimTime }) {
  return (
    <div className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-2.5">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-xl">🌾</div>
      <div className="flex-1">
        <div className="font-semibold leading-tight">FarmGate</div>
        <div className="text-xs text-zinc-500">Trợ lý bán nông sản</div>
      </div>
      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
        📅 {dayLabel(now.day)}
      </span>
    </div>
  );
}

// ---------- Bong bóng ----------

function VoiceBubble({ text }: { text: string }) {
  const seconds = Math.max(2, Math.round(text.length / 12));
  // Thanh sóng âm cố định theo độ dài câu để không đổi giữa các lần render
  const bars = Array.from({ length: 18 }, (_, i) => 6 + ((text.charCodeAt(i % text.length) * (i + 3)) % 14));
  return (
    <div className="max-w-[80%] rounded-2xl rounded-br-md bg-[#d4e6ff] px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">🎤</span>
        <div className="flex h-5 items-center gap-[2px]">
          {bars.map((h, i) => (
            <span key={i} className="w-[3px] rounded-full bg-sky-600" style={{ height: h }} />
          ))}
        </div>
        <span className="text-xs text-sky-800">0:{String(seconds).padStart(2, "0")}</span>
      </div>
      <p className="mt-1 text-[13px] italic leading-snug text-zinc-600">“{text}”</p>
    </div>
  );
}

function ChatRow({ item, depotName }: { item: ChatItem; depotName: string }) {
  switch (item.from) {
    case "system":
      return <div className="py-1 text-center text-xs font-medium text-zinc-500">{item.text}</div>;
    case "farmer":
      return (
        <div className="flex justify-end">
          {item.voice ? (
            <VoiceBubble text={item.text} />
          ) : (
            <div className="max-w-[80%] rounded-2xl rounded-br-md bg-[#d4e6ff] px-3 py-2 text-[15px]">{item.text}</div>
          )}
        </div>
      );
    case "bot":
      return (
        <div className="flex items-end gap-1.5">
          <div className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm">
            🌾
          </div>
          <div className="max-w-[85%]">
            {item.message.text && (
              <div className="rounded-2xl rounded-bl-md bg-white px-3 py-2 text-[15px] leading-relaxed shadow-sm">
                {item.message.text}
              </div>
            )}
            {item.message.card && <BotCardView card={item.message.card} depotName={depotName} />}
          </div>
        </div>
      );
  }
}

/** Thời gian "đang soạn tin…" trước mỗi tin của FarmGate. */
export const BOT_TYPING_MS = 600;

/**
 * Hiện tin nhắn lần lượt: tin của bác Ba / dòng giờ hiện ngay, tin của FarmGate hiện sau
 * hiệu ứng "đang soạn tin…". Chỉ là hiệu ứng hiển thị — trạng thái phiên đã cập nhật xong từ trước.
 */
export function useRevealedChat(chat: ChatItem[]): { visible: ChatItem[]; typing: boolean } {
  const [revealed, setRevealed] = useState(0);
  const shown = Math.min(revealed, chat.length);
  const next = chat[shown];

  useEffect(() => {
    // Reset: chat ngắn lại → đồng bộ bộ đếm
    if (revealed > chat.length) {
      const t = setTimeout(() => setRevealed(chat.length), 0);
      return () => clearTimeout(t);
    }
    if (!next) return;
    const t = setTimeout(() => setRevealed(shown + 1), next.from === "bot" ? BOT_TYPING_MS : 0);
    return () => clearTimeout(t);
  }, [revealed, chat.length, shown, next]);

  return { visible: chat.slice(0, shown), typing: next?.from === "bot" };
}

function TypingBubble() {
  return (
    <div className="flex items-end gap-1.5">
      <div className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm">🌾</div>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-3 py-3 shadow-sm" aria-label="FarmGate đang soạn tin">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-2 w-2 animate-bounce rounded-full bg-zinc-400"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export function ChatList({
  chat,
  typing,
  depotName,
}: {
  chat: ChatItem[];
  typing: boolean;
  depotName: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Cuộn trong khung chat, không cuộn cả trang
    const box = boxRef.current;
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
  }, [chat.length, typing]);

  return (
    <div ref={boxRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
      {chat.length === 0 && !typing && (
        <div className="mt-20 text-center text-sm text-zinc-500">Chưa có tin nhắn. Bấm “Bước tiếp” để bắt đầu.</div>
      )}
      {chat.map((item) => (
        <ChatRow key={item.id} item={item} depotName={depotName} />
      ))}
      {typing && <TypingBubble />}
    </div>
  );
}

// ---------- Trả lời nhanh & ô nhập ----------

export function QuickReplies({ chips, onTap }: { chips: Chip[]; onTap: (chip: Chip) => void }) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 border-t border-zinc-200 bg-white/80 px-3 py-2">
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          onClick={() => onTap(chip)}
          className="rounded-full border border-green-600 bg-white px-3 py-1.5 text-sm font-medium text-green-800 hover:bg-green-50"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}

export function InputBar({
  voiceText,
  onVoice,
  onSend,
}: {
  /** Câu tin thoại sẽ gửi khi bấm 🎤 (undefined = không có câu nào đang chờ) */
  voiceText?: string;
  onVoice: () => void;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    onSend(value);
    setText("");
  };
  return (
    <form onSubmit={submit} className="flex items-center gap-2 border-t border-zinc-200 bg-white px-3 py-2.5">
      <button
        type="button"
        onClick={onVoice}
        disabled={!voiceText}
        title={voiceText ? `Gửi tin thoại: “${voiceText}”` : "Chưa có câu nói nào trong kịch bản"}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
          voiceText ? "animate-pulse bg-sky-600 text-white" : "bg-zinc-100 text-zinc-400"
        }`}
      >
        🎤
      </button>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Nhắn cho FarmGate…"
        className="min-w-0 flex-1 rounded-full bg-zinc-100 px-4 py-2 text-[15px] outline-none focus:ring-2 focus:ring-green-500"
      />
      <button
        type="submit"
        disabled={!text.trim()}
        className="h-10 w-10 shrink-0 rounded-full bg-green-600 text-white disabled:bg-zinc-200"
        aria-label="Gửi"
      >
        ➤
      </button>
    </form>
  );
}

"use client";

import { useEffect, useRef } from "react";
import type { ParseResult, Trigger } from "@/advisor/types";
import type { BrainEntry } from "@/domain/session";

const TRIGGER_LABEL: Record<Trigger["type"], string> = {
  tick: "FarmGate tự kiểm tra",
  offer_draft: "Thẻ chào giá chờ xác nhận",
  offer_confirmed: "Bác xác nhận chào giá",
  weather_changed: "Thời tiết thay đổi",
  deal_confirmed: "Bác bấm chốt bán",
  deal_declined: "Bác chưa chốt",
  offer_discarded: "Bác bấm Sửa",
  weigh: "Báo kết quả cân",
  unknown: "Không hiểu câu nói",
};

function parseSummary(parse: ParseResult): string {
  switch (parse.kind) {
    case "offer": {
      const missing = parse.missing.length ? ` · thiếu: ${parse.missing.join(", ")}` : "";
      return `chào giá ${JSON.stringify(parse.draft)}${missing}`;
    }
    case "offer_update":
      return `cập nhật ${parse.buyer} ${JSON.stringify(parse.patch)}`;
    case "weigh":
      return `cân ${JSON.stringify(parse.report)}`;
    case "unknown":
      return "không khớp mẫu nào";
  }
}

/** Gắn nhãn ai làm phần việc này: code tính, luật, hay Guard. */
function traceTag(line: string): { tag: string; tone: string } {
  if (line.startsWith("GUARD")) return { tag: "GUARD", tone: "bg-red-100 text-red-800" };
  if (line.includes("(code)")) return { tag: "CODE", tone: "bg-violet-100 text-violet-800" };
  if (/^R\d/.test(line)) return { tag: "LUẬT", tone: "bg-amber-100 text-amber-800" };
  return { tag: "LUỒNG", tone: "bg-zinc-100 text-zinc-700" };
}

function Tag({ children, tone }: { children: React.ReactNode; tone: string }) {
  return <span className={`mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold ${tone}`}>{children}</span>;
}

function Entry({ entry }: { entry: BrainEntry }) {
  const ok = entry.violations.length === 0;
  return (
    <li className="border-l-2 border-zinc-200 pl-3">
      <div className="text-xs text-zinc-500">
        [{entry.at.time}] <b className="text-zinc-800">{TRIGGER_LABEL[entry.trigger.type]}</b>
      </div>
      {entry.input && <div className="mt-0.5 text-xs italic text-zinc-600">“{entry.input}”</div>}
      <ul className="mt-1 space-y-0.5 font-mono text-[11px] leading-snug text-zinc-700">
        {entry.parse && (
          <li>
            <Tag tone="bg-sky-100 text-sky-800">PARSER</Tag>
            {parseSummary(entry.parse)}
          </li>
        )}
        {entry.trace.map((line, i) => {
          const { tag, tone } = traceTag(line);
          return (
            <li key={i}>
              <Tag tone={tone}>{tag}</Tag>
              {line}
            </li>
          );
        })}
        <li>
          <Tag tone={ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>GUARD</Tag>
          {ok ? "✅ hợp lệ" : `❌ chặn ${entry.violations.length} lỗi`}
        </li>
      </ul>
    </li>
  );
}

export function BrainLog({ entries }: { entries: BrainEntry[] }) {
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Cuộn trong khung, không cuộn cả trang
    const box = boxRef.current;
    // Cuộn ngay (không "smooth") — khi tự chạy, nhiều dòng tới liên tiếp làm cuộn mượt dừng giữa chừng
    if (box) box.scrollTop = box.scrollHeight;
  }, [entries.length]);

  return (
    <div ref={boxRef} className="max-h-80 overflow-y-auto pr-1">
      {entries.length === 0 ? (
        <p className="text-sm text-zinc-500">Chưa có lượt xử lý nào.</p>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <Entry key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  );
}

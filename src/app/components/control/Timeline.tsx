import { formatSimTime } from "@/lib/format";
import { stepStatus, type DemoState } from "@/scenario/runner";
import { SCENARIO } from "@/scenario/script";

const ICON = { done: "✔", active: "▶", pending: "○" } as const;
const TONE = {
  done: "text-zinc-400",
  active: "bg-green-50 font-semibold text-green-900 ring-1 ring-green-300",
  pending: "text-zinc-600",
} as const;

export function Timeline({ demo, waitingHint }: { demo: DemoState; waitingHint?: string }) {
  return (
    <ol className="space-y-1">
      {SCENARIO.map((step) => {
        const status = stepStatus(demo, step.id);
        return (
          <li key={step.id} className={`rounded-lg px-2.5 py-1.5 text-sm ${TONE[status]}`}>
            <div className="flex gap-2">
              <span className="w-4 shrink-0 text-center">{ICON[status]}</span>
              <span className="w-28 shrink-0 tabular-nums">{formatSimTime(step.at)}</span>
              <span>{step.title}</span>
            </div>
            {status === "active" && waitingHint && (
              <div className="ml-6 mt-1 text-xs font-normal text-sky-700">👉 {waitingHint}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

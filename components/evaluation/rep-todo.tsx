import { AlarmClock, CalendarClock, ChevronRight, ClipboardPen, FileText } from "lucide-react";
import Link from "next/link";

import type { LucideIcon } from "lucide-react";

export type TodoItem = {
  icon: "coaching" | "report" | "late" | "self";
  title: string;
  text: string;
  href: string;
  urgent?: boolean;
};

const ICONS: Record<TodoItem["icon"], LucideIcon> = {
  coaching: CalendarClock,
  report: FileText,
  late: AlarmClock,
  self: ClipboardPen,
};

/** Encart « À faire pour toi » en tête de « Ma progression » (§4.9). */
export function RepTodo({ items }: { items: TodoItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="todo-title" className="mb-6">
      <h2 id="todo-title" className="mb-3 text-lg font-semibold">
        À faire pour toi
      </h2>
      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <li key={item.href + item.title}>
              <Link
                href={item.href}
                className={`flex min-h-16 items-center gap-3 rounded-(--radius-card) border px-4 py-3 hover:bg-bone ${
                  item.urgent ? "border-danger/50 bg-danger/[0.04]" : "border-line bg-surface"
                }`}
              >
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                    item.urgent ? "bg-danger/10 text-danger" : "bg-fluo text-forest-deep"
                  }`}
                >
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{item.title}</span>
                  <span className="block text-sm text-muted first-letter:uppercase">
                    {item.text}
                  </span>
                </span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

import type { HTMLAttributes } from "react";

import { cn } from "../../lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "default" | "positive" | "negative" | "neutral";
};

const toneClassMap: Record<NonNullable<BadgeProps["tone"]>, string> = {
  default: "border-[color:var(--line)] bg-[color:var(--surface-strong)] text-[color:var(--foreground)]",
  positive: "border-red-200/80 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-200",
  negative: "border-sky-200/80 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-950/40 dark:text-sky-200",
  neutral: "border-stone-200/80 bg-stone-50 text-stone-700 dark:border-stone-500/30 dark:bg-stone-950/40 dark:text-stone-200"
};

export function Badge({
  className,
  tone = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] uppercase",
        toneClassMap[tone],
        className
      )}
      {...props}
    />
  );
}

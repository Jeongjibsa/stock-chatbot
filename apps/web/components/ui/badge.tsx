import type { HTMLAttributes } from "react";

import { cn } from "../../lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "default" | "positive" | "negative" | "neutral";
};

const toneClassMap: Record<NonNullable<BadgeProps["tone"]>, string> = {
  default:
    "border-[color:var(--line)] bg-[color:var(--surface-strong)] text-[color:var(--foreground)]",
  positive:
    "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black",
  negative:
    "border-black bg-white text-black dark:border-white dark:bg-black dark:text-white",
  neutral:
    "border-[color:var(--line-strong)] bg-[color:var(--surface-muted)] text-[color:var(--foreground)]"
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

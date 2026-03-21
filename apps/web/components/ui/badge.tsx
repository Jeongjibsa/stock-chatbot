import type { HTMLAttributes } from "react";

import { cn } from "../../lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "default" | "positive" | "negative" | "neutral";
};

const toneClassMap: Record<NonNullable<BadgeProps["tone"]>, string> = {
  default:
    "border-[color:var(--line)] bg-[color:var(--surface)] text-[color:var(--foreground)]",
  positive:
    "border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.09)] text-[color:var(--accent-strong)]",
  negative:
    "border-[color:var(--line-strong)] bg-[rgba(15,23,42,0.06)] text-[color:var(--foreground)]",
  neutral:
    "border-[color:var(--line)] bg-[color:var(--surface-muted)] text-[color:var(--muted)]"
};

export function Badge({
  className,
  tone = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] uppercase shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]",
        toneClassMap[tone],
        className
      )}
      {...props}
    />
  );
}

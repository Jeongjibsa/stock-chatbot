import type { HTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-[color:var(--line)] bg-[color:var(--surface)] shadow-[0_14px_36px_rgba(15,23,42,0.06)] transition-all duration-200",
        className
      )}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 sm:p-7", className)} {...props} />;
}

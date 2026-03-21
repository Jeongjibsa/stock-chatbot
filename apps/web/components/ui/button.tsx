import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold tracking-[-0.01em] transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]",
  {
    variants: {
      variant: {
        default:
          "bg-[color:var(--accent)] px-4 py-2.5 text-white shadow-[0_10px_24px_rgba(59,130,246,0.18)] hover:-translate-y-px hover:bg-[color:var(--accent-strong)]",
        secondary:
          "bg-[color:var(--surface)] px-4 py-2.5 text-[color:var(--foreground)] ring-1 ring-inset ring-[color:var(--line)] shadow-[0_1px_0_rgba(255,255,255,0.9)] hover:-translate-y-px hover:bg-[color:var(--surface-muted)]",
        ghost:
          "px-3 py-2 text-[color:var(--muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--foreground)]"
      },
      size: {
        default: "h-10",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-5 text-[0.95rem]"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border text-sm font-semibold tracking-[-0.01em] transition-all duration-200 outline-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]",
  {
    variants: {
      variant: {
        default:
          "border-[color:var(--accent-strong)] bg-[color:var(--accent)] px-4 py-2.5 text-white shadow-[0_14px_30px_rgba(118,156,228,0.24)] hover:-translate-y-px hover:border-[color:var(--accent-strong)] hover:bg-[color:var(--accent-strong)]",
        secondary:
          "border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-2.5 text-[color:var(--foreground)] shadow-[0_1px_0_rgba(255,255,255,0.9)] hover:-translate-y-px hover:border-[color:var(--line-strong)] hover:bg-[color:var(--surface-muted)]",
        ghost:
          "border-transparent px-3 py-2 text-[color:var(--foreground)] shadow-none hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--accent-strong)]"
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

import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-forest/8 text-forest-deep",
        brand: "bg-forest text-bone",
        accent: "bg-fluo text-forest-deep",
        success: "bg-success/15 text-forest-deep",
        warning: "bg-warning/20 text-forest-deep",
        danger: "bg-danger/12 text-danger",
        muted: "bg-line text-muted",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

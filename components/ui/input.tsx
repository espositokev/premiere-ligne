import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Champ texte. Toujours l'associer à un <Label htmlFor>. */
function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "min-h-11 w-full rounded-(--radius-control) border border-line bg-surface px-3 text-base text-forest-deep placeholder:text-subtle",
        "focus-visible:border-forest focus-visible:ring-3 focus-visible:ring-forest/15 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-danger aria-invalid:ring-danger/15",
        className,
      )}
      {...props}
    />
  );
}

function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-24 w-full rounded-(--radius-control) border border-line bg-surface px-3 py-2.5 text-base text-forest-deep placeholder:text-subtle",
        "focus-visible:border-forest focus-visible:ring-3 focus-visible:ring-forest/15 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-danger",
        className,
      )}
      {...props}
    />
  );
}

function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn("text-sm font-semibold text-forest-deep", className)}
      {...props}
    />
  );
}

export { Input, Textarea, Label };

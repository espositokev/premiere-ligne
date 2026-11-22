import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Bouton Première Ligne (base shadcn/ui).
 * - primary : fluo avec texte forêt, pour l'action principale d'un écran (une seule par écran).
 * - secondary : forêt avec texte os.
 * - outline, ghost : actions secondaires.
 * - danger : actions destructives, toujours précédées d'une confirmation.
 * Hauteur minimale de 44 px en taille par défaut, pour le pouce sur mobile.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-(--radius-control) font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-fluo text-forest-deep hover:bg-fluo-hover",
        secondary: "bg-forest text-bone hover:bg-forest-light",
        outline: "border border-line bg-surface text-forest-deep hover:border-forest hover:bg-bone",
        ghost: "text-forest-deep hover:bg-forest/5",
        danger: "bg-danger text-white hover:bg-danger/90",
      },
      size: {
        default: "min-h-11 px-5 text-base",
        sm: "min-h-9 px-3 text-sm",
        lg: "min-h-12 px-6 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Rend l'enfant (par exemple un lien) avec l'apparence du bouton. */
    asChild?: boolean;
  };

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };

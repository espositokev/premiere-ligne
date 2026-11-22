"use client";

import { Toaster as Sonner } from "sonner";

/** Notifications de confirmation (§10.4). Utiliser `toast()` de "sonner" pour en afficher une. */
export function Toaster() {
  return (
    <Sonner
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "!rounded-(--radius-card) !border-line !bg-surface !text-forest-deep !font-sans !shadow-(--shadow-card)",
          description: "!text-muted",
        },
      }}
    />
  );
}

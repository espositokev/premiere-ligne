/** État renvoyé par une server action à son formulaire (avec useActionState). */
export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Change à chaque envoi réussi, pour vider le formulaire ou afficher un toast une seule fois. */
  nonce?: number;
};

export const initialFormState: FormState = { status: "idle" };

export function formError(message: string, fieldErrors?: Record<string, string>): FormState {
  return { status: "error", message, fieldErrors };
}

export function formSuccess(message: string): FormState {
  return { status: "success", message, nonce: Date.now() };
}

/** Message générique pour une erreur inattendue : on ne montre jamais le détail technique. */
export const UNEXPECTED_ERROR = "Une erreur est survenue. Réessayez dans un instant.";

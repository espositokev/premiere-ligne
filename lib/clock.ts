/** Heure courante, isolée pour garder les composants purs et les calculs testables. */
export function now(): Date {
  return new Date();
}

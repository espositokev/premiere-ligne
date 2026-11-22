import type { Metadata } from "next";

import { LegalDocument } from "@/components/layout/legal-document";
import { fr } from "@/lib/i18n/fr";

export const metadata: Metadata = { title: fr.legal.terms };

export default function TermsPage() {
  return (
    <LegalDocument
      title={fr.legal.terms}
      updatedAt="[À COMPLÉTER : date]"
      sections={[
        {
          title: "Objet",
          paragraphs: [
            "Les présentes conditions encadrent l'utilisation de la plateforme Première Ligne par les utilisateurs invités par une entreprise cliente : responsables, managers et commerciaux.",
          ],
        },
        {
          title: "Accès au service",
          paragraphs: [
            "L'accès se fait uniquement sur invitation. Chaque compte est personnel : vous vous engagez à ne pas partager vos accès et à prévenir votre responsable en cas d'utilisation suspecte.",
            "Votre entreprise peut désactiver votre compte à tout moment, notamment en cas de départ.",
          ],
        },
        {
          title: "Utilisation",
          paragraphs: [
            "Les évaluations, comptes rendus et notes doivent rester factuels, professionnels et liés au travail. Il est interdit d'y saisir des données sensibles (santé, opinions, vie privée).",
          ],
        },
        {
          title: "Responsabilités",
          paragraphs: [
            "[À COMPLÉTER : limitation de responsabilité, disponibilité du service, maintenance.]",
          ],
        },
        {
          title: "Droit applicable",
          paragraphs: [
            "Les présentes conditions sont soumises au droit français. [À COMPLÉTER : tribunal compétent.]",
          ],
        },
      ]}
    />
  );
}

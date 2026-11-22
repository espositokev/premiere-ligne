import type { Metadata } from "next";

import { LegalDocument } from "@/components/layout/legal-document";
import { fr } from "@/lib/i18n/fr";

export const metadata: Metadata = { title: fr.legal.notice };

export default function LegalNoticePage() {
  return (
    <LegalDocument
      title={fr.legal.notice}
      updatedAt="[À COMPLÉTER : date]"
      sections={[
        {
          title: "Éditeur du site",
          paragraphs: [
            "Le site et la plateforme Première Ligne sont édités par [À COMPLÉTER : raison sociale], [À COMPLÉTER : forme juridique] au capital de [À COMPLÉTER : montant] €, immatriculée au RCS de [À COMPLÉTER : ville] sous le numéro [À COMPLÉTER : SIREN].",
            "Siège social : [À COMPLÉTER : adresse]. Numéro de TVA intracommunautaire : [À COMPLÉTER].",
            "Directeur de la publication : [À COMPLÉTER : nom]. Contact : [À COMPLÉTER : email].",
          ],
        },
        {
          title: "Hébergement",
          paragraphs: [
            "Application : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis. Les fonctions serveur sont exécutées dans la région de Paris (France).",
            "Données : Supabase Inc., hébergement dans l'Union européenne ([À COMPLÉTER : région du projet de production]).",
          ],
        },
        {
          title: "Propriété intellectuelle",
          paragraphs: [
            "Les contenus de la plateforme (textes, référentiels de compétences, Dojos, logos, graphismes) sont la propriété de [À COMPLÉTER : raison sociale] ou de ses partenaires. Toute reproduction sans autorisation écrite est interdite.",
          ],
        },
      ]}
    />
  );
}

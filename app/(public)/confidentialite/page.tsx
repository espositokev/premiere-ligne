import type { Metadata } from "next";

import { LegalDocument } from "@/components/layout/legal-document";
import { fr } from "@/lib/i18n/fr";

export const metadata: Metadata = { title: fr.legal.privacy };

export default function PrivacyPage() {
  return (
    <LegalDocument
      title={fr.legal.privacy}
      updatedAt="[À COMPLÉTER : date]"
      sections={[
        {
          title: "Qui est responsable de vos données ?",
          paragraphs: [
            "Votre employeur, client de Première Ligne, est responsable du traitement des données vous concernant sur la plateforme. Première Ligne agit en tant que sous-traitant : elle traite ces données uniquement pour fournir le service, selon les instructions de votre employeur.",
            "Pour les données des visiteurs du site public et des contacts commerciaux, le responsable de traitement est [À COMPLÉTER : raison sociale].",
          ],
        },
        {
          title: "Quelles données ?",
          paragraphs: [
            "Identité et contact professionnels (prénom, nom, email, téléphone facultatif, photo facultative), poste, équipe et manager.",
            "Données de suivi professionnel : évaluations de compétences, auto-évaluations, comptes rendus de coaching, plans d'action, Dojos réalisés.",
            "Données techniques : journaux de connexion et d'activité, nécessaires à la sécurité du service.",
          ],
        },
        {
          title: "Pourquoi ?",
          paragraphs: [
            "Accompagner la montée en compétences des équipes commerciales : évaluation, coaching, formation et suivi des progrès. Les données ne sont jamais vendues, ni utilisées à des fins publicitaires.",
          ],
        },
        {
          title: "Où et combien de temps ?",
          paragraphs: [
            "Les données et leurs sauvegardes sont hébergées dans l'Union européenne.",
            "Elles sont conservées pendant la durée du contrat avec votre employeur. Les données d'un utilisateur désactivé sont anonymisées au bout de [À COMPLÉTER : 24 mois par défaut]. En fin de contrat, les données de l'entreprise sont exportées puis supprimées définitivement après 30 jours.",
          ],
        },
        {
          title: "Cookies",
          paragraphs: [
            "La plateforme n'utilise que des cookies strictement nécessaires (session de connexion, préférences d'affichage). Aucun traceur publicitaire ni de mesure d'audience tierce.",
          ],
        },
        {
          title: "Vos droits",
          paragraphs: [
            "Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité. Adressez votre demande à votre employeur ou à [À COMPLÉTER : email de contact données personnelles], qui la transmettra.",
            "Vous pouvez aussi introduire une réclamation auprès de la CNIL (www.cnil.fr).",
          ],
        },
      ]}
    />
  );
}

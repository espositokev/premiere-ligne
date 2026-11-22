/**
 * Textes affichés de l'application (§12.3).
 * Le code est en anglais, tout ce que l'utilisateur lit est ici, en français.
 */
export const fr = {
  brand: {
    name: "Première Ligne",
    tagline: "On forme là où ça se joue.",
  },
  home: {
    title: "Faites progresser vos vendeurs, là où ça se joue.",
    lead: "Première Ligne forme les équipes commerciales et les managers sur le terrain. La plateforme suit la montée en compétences de chaque vendeur : évaluations, coachings, plans d'action et Dojos.",
    login: "Se connecter",
    contact: "Nous contacter",
    contactEmail: "contact@premiereligne-app.fr",
    pillars: [
      {
        title: "Évaluer",
        text: "Une matrice de compétences claire, notée de 0 à 4, avec l'avis du manager et celui du vendeur côte à côte.",
      },
      {
        title: "Coacher",
        text: "Un coaching terrain préparé en quelques secondes et un compte rendu rédigé sur place, depuis le téléphone.",
      },
      {
        title: "S'entraîner",
        text: "Des Dojos prêts à l'emploi, proposés automatiquement sur les compétences à travailler.",
      },
    ],
  },
  legal: {
    notice: "Mentions légales",
    privacy: "Politique de confidentialité",
    terms: "Conditions générales d'utilisation",
    toComplete: "[À COMPLÉTER]",
    draftWarning:
      "Ce document est un modèle. Les zones [À COMPLÉTER] doivent être remplies avant la mise en production.",
    backHome: "Retour à l'accueil",
  },
  levels: {
    none: "Non évaluée",
    0: "Ne connaît pas",
    1: "Connaît la théorie, ne l'applique pas encore",
    2: "Applique, avec des axes d'amélioration",
    3: "Maîtrise, résultats réguliers",
    4: "Expert, capable de transmettre",
  },
} as const;

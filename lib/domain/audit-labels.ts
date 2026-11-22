/** Libellés lisibles du journal d'activité (§4.12). */
export const AUDIT_LABELS: Record<string, string> = {
  "auth.login": "Connexion",
  "auth.logout": "Déconnexion",
  "organization.created": "Entreprise créée",
  "organization.updated": "Entreprise modifiée",
  "organization.status_changed": "Statut de l'entreprise changé",
  "organization.purged": "Entreprise supprimée définitivement",
  "invitation.created": "Invitation envoyée",
  "invitation.resent": "Invitation renvoyée",
  "invitation.revoked": "Invitation annulée",
  "invitation.accepted": "Invitation acceptée",
  "member.updated": "Utilisateur modifié",
  "member.role_changed": "Rôle changé",
  "member.deactivated": "Accès désactivé",
  "member.reactivated": "Accès réactivé",
  "member.anonymized": "Utilisateur anonymisé",
  "team.created": "Équipe créée",
  "team.updated": "Équipe modifiée",
  "profile.updated": "Profil modifié",
  "template.created": "Modèle créé",
  "template.deleted": "Modèle supprimé",
  "framework.created": "Matrice mise en place",
  "dojo.status_changed": "Statut d'un Dojo changé",
  "dojo.deleted": "Dojo supprimé",
  "dojo_session.created": "Séance de Dojo notée",
  "evaluation.validated": "Évaluation validée",
  "evaluation.corrected": "Évaluation corrigée",
  "manager_note.deleted": "Note privée supprimée",
  "coaching.created": "Coaching planifié",
  "coaching.cancelled": "Coaching annulé",
  "coaching.closed": "Compte rendu clôturé",
  "coaching.reopened": "Compte rendu rouvert",
  "coaching_request.created": "Demande de coaching",
  "coaching_request.declined": "Demande de coaching refusée",
  "action.deleted": "Action supprimée",
  "preview.started": "« Voir en tant que »",
  "export.csv": "Export de tableau",
  "export.user_data": "Export de données personnelles",
  "settings.updated": "Paramètres modifiés",
};

/** Familles proposées dans le filtre du journal. */
export const AUDIT_FILTERS = [
  { value: "", label: "Tout" },
  { value: "auth.", label: "Connexions" },
  { value: "member.", label: "Utilisateurs" },
  { value: "invitation.", label: "Invitations" },
  { value: "evaluation.", label: "Évaluations" },
  { value: "coaching", label: "Coachings" },
  { value: "preview.", label: "Voir en tant que" },
  { value: "export.", label: "Exports" },
] as const;

export function auditLabel(action: string): string {
  return AUDIT_LABELS[action] ?? action;
}

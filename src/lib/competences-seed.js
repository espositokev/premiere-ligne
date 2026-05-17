// Données de base : 12 compétences automobile + leurs sous-compétences et dojos associés
export const DEFAULT_COMPETENCES = [
  {
    numero: 1, title: 'Accueil & prise en charge',
    sous: [
      'Je sais accueillir physiquement le client',
      'Je sais créer le contact et briser la glace',
      'Je qualifie le projet dès l\'accueil',
    ],
    dojos: ['Accueil physique', 'Brise-glace', 'Qualification accueil'],
  },
  {
    numero: 2, title: 'Découverte & qualification',
    sous: [
      'Je mène une découverte complète en 5-6 questions',
      'Je qualifie le budget et le financement',
      'Je détecte les motivations SONCASE',
      'Je reformule le projet pour valider ma compréhension',
    ],
    dojos: ['Découverte complète', 'Qualification budget', 'SONCASE', 'Reformulation'],
  },
  {
    numero: 3, title: 'Présentation véhicule',
    sous: [
      'Je structure ma présentation (CAB)',
      'Je mets en scène le véhicule (sensoriel)',
      'J\'adapte mon argumentaire au profil client',
    ],
    dojos: ['CAB véhicule', 'Présentation sensorielle', 'Argumentaire profil'],
  },
  {
    numero: 4, title: 'Essai dynamique',
    sous: [
      'Je prépare l\'essai (itinéraire, durée)',
      'J\'anime l\'essai avec des questions ouvertes',
      'Je conclue l\'essai avec un engagement',
    ],
    dojos: ['Préparation essai', 'Animation essai', 'Closing essai'],
  },
  {
    numero: 5, title: 'Financement & assurances',
    sous: [
      'Je sais teaser le financement en découverte',
      'Je maîtrise le CAB financement',
      'Je sais closer le financement',
      'Je gère les objections financement',
      'Je connais les offres Fi en vigueur',
      'Je propose systématiquement l\'assurance',
    ],
    dojos: ['Teasing Fi', 'CAB Fi', 'Closing Fi', 'Objections Fi', 'Offres Fi', 'Assurance'],
  },
  {
    numero: 6, title: 'Reprise & permutation',
    sous: [
      'Je qualifie le véhicule de reprise (argus)',
      'Je valorise la reprise comme levier de closing',
      'Je gère les écarts de valeur avec le client',
    ],
    dojos: ['Qualification reprise', 'Reprise levier', 'Gestion écart reprise'],
  },
  {
    numero: 7, title: 'Closing & négociation',
    sous: [
      'Je détecte les signaux d\'achat',
      'Je formule une proposition ferme et assumée',
      'Je tiens le silence après la proposition',
      'Je gère les objections prix',
    ],
    dojos: ['Signaux achat', 'Proposition ferme', 'Silence closing', 'Objections prix'],
  },
  {
    numero: 8, title: 'Livraison & suivi client',
    sous: [
      'Je prépare et ritualise la livraison',
      'Je prends un RDV de suivi à J+7',
      'Je génère des recommandations actives',
    ],
    dojos: ['Rituel livraison', 'Suivi J+7', 'Recommandations'],
  },
  {
    numero: 9, title: 'Communication',
    sous: [
      'J\'interprète les signaux non-verbaux',
      'J\'adapte mon comportement au client',
      'J\'utilise le SONCASE dans mon argumentation',
    ],
    dojos: ['Signaux comm.', 'Adapter comportement', 'SONCASE'],
  },
  {
    numero: 10, title: 'Gestion du temps & organisation',
    sous: [
      'Je planifie mes RDV et mes relances',
      'Je documente chaque contact CRM',
      'Je priorise mes actions selon le pipeline',
    ],
    dojos: ['Planification RDV', 'CRM rigoureux', 'Pipeline priorisation'],
  },
  {
    numero: 11, title: 'Prospection & fidélisation',
    sous: [
      'Je relance mes clients à J+30, J+90',
      'Je travaille mon portefeuille VO/VN',
      'Je génère des apporteurs d\'affaires',
    ],
    dojos: ['Relances systématiques', 'Portefeuille client', 'Apporteurs affaires'],
  },
  {
    numero: 12, title: 'Posture & attitude commerciale',
    sous: [
      'Je me fixe des objectifs personnels de progression',
      'J\'adopte une posture proactive',
      'Je suis résilient face aux refus',
      'Je pratique l\'auto-analyse après chaque RDV',
    ],
    dojos: ['Auto-fixation', 'Posture proactive', 'Résilience', 'Auto-analyse'],
  },
]

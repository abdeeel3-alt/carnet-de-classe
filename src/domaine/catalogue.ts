import type { Base, Regle, TypeObservation } from './types';

type TypeDepart = Omit<TypeObservation, keyof Base>;
type RegleDepart = Omit<Regle, keyof Base>;

const t = (
  critere: TypeDepart['critere'],
  libelle: string,
  points: number,
  synonymes: string[] = [],
  code: TypeDepart['code'] = null,
): Omit<TypeDepart, 'ordre'> => ({ critere, libelle, points, masque: false, synonymes, code });

/** Les 14 observations proposées au premier lancement (section 4 de la spec). */
export function typesDeDepart(): TypeDepart[] {
  return [
    t('presence', 'Absent', 0, ['absente', 'absents'], 'absent'),
    t('presence', 'Retard', 0, ['en retard', 'retardataire'], 'retard'),
    t('reglement', 'Sans uniforme', -1, ['sans tablier', "pas d'uniforme"]),
    t('reglement', 'Matériel oublié', -1),
    t('reglement', 'Téléphone en classe', -2),
    t('participation', 'Bonne participation', 1, ['participation plus', 'participe']),
    t('participation', 'Passage au tableau', 1),
    t('participation', 'Excellente réponse', 2),
    t('discipline', 'Bavardage', -1, ['bavarde', 'discipline moins']),
    t('discipline', 'Perturbe le cours', -2),
    t('discipline', 'Manque de respect', -3),
    t('serieux', 'Travail soigné', 1, ['sérieux plus']),
    t('serieux', 'Travail non fait', -1, ['devoir non fait', 'sérieux moins']),
    t('serieux', 'Ne suit pas', -1),
  ].map((x, ordre) => ({ ...x, ordre }));
}

/** Les 5 règles proposées au premier lancement. */
export function reglesDeDepart(): RegleDepart[] {
  return [
    { nom: 'Participant actif', type: 'badge', cible: 'participation', seuil: 10, periode: 'mois' },
    { nom: 'Élève exemplaire', type: 'badge', cible: 'total', seuil: 20, periode: 'semestre' },
    { nom: 'Avertissement', type: 'sanction', cible: 'discipline', seuil: -5, periode: 'mois' },
    { nom: 'Convocation des parents', type: 'sanction', cible: 'discipline', seuil: -10, periode: 'semestre' },
    { nom: "Signalement à l'administration", type: 'sanction', cible: 'retards', seuil: 3, periode: 'mois' },
  ];
}

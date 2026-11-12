// Fabriques de données pour les tests uniquement.
import type { Attribution, Critere, Eleve, Observation, Parametres, Regle, TypeObservation } from './types';

let n = 0;
const id = (p: string) => `${p}${++n}`;

export const parametresTest: Parametres = {
  id: 'parametres', updated_at: '', deleted: false,
  semestre1_debut: '2026-09-07', semestre1_fin: '2027-01-24',
  semestre2_debut: '2027-01-25', semestre2_fin: '2027-06-30',
  etablissement: 'Collège Test', professeur: 'M. Test', matiere: 'Mathématiques',
};

export const local = (a: number, m: number, j: number, h = 0, mi = 0, s = 0, ms = 0) => new Date(a, m - 1, j, h, mi, s, ms);

export function obs(eleve_id: string, critere: Critere, points: number, extra: Partial<Observation> = {}): Observation {
  return {
    id: id('o'), updated_at: '', deleted: false, seance_id: 's1', eleve_id, type_id: 't', critere,
    code: null, libelle: critere, points, horodatage: local(2026, 11, 12, 9).toISOString(), ...extra,
  };
}
export function regle(r: Partial<Regle>): Regle {
  return { id: id('r'), updated_at: '', deleted: false, nom: 'Règle', type: 'badge', cible: 'total', seuil: 1, periode: 'mois', ...r };
}
export function attribution(a: Partial<Attribution>): Attribution {
  return { id: id('a'), updated_at: '', deleted: false, eleve_id: 'e1', regle_id: null, libelle: '', type: 'badge', date: '', etat: 'proposee', cle_periode: '', ...a };
}
export function eleve(numero: number, prenom: string, nom: string, extra: Partial<Eleve> = {}): Eleve {
  return { id: `e${numero}`, updated_at: '', deleted: false, classe_id: 'c1', numero, nom, prenom, rangee: null, colonne: null, remarques: '', ...extra };
}
export function type(libelle: string, critere: Critere, points: number, extra: Partial<TypeObservation> = {}): TypeObservation {
  return { id: id('t'), updated_at: '', deleted: false, critere, libelle, points, ordre: 0, masque: false, synonymes: [], code: null, ...extra };
}

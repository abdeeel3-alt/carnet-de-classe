import type { Creneau } from './types';

export const JOURS: { jour: Creneau['jour']; nom: string; court: string }[] = [
  { jour: 1, nom: 'Lundi', court: 'Lun' }, { jour: 2, nom: 'Mardi', court: 'Mar' }, { jour: 3, nom: 'Mercredi', court: 'Mer' },
  { jour: 4, nom: 'Jeudi', court: 'Jeu' }, { jour: 5, nom: 'Vendredi', court: 'Ven' }, { jour: 6, nom: 'Samedi', court: 'Sam' },
];

const heure = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Créneaux du jour de la date donnée, triés par heure de début. Le dimanche n'a pas de créneau. */
export function seancesDuJour(creneaux: Creneau[], date: Date): Creneau[] {
  const jour = date.getDay(); // dimanche = 0
  return creneaux.filter((c) => !c.deleted && c.jour === jour).sort((a, b) => a.debut.localeCompare(b.debut));
}

/** Créneau en cours (début inclus, fin exclue) et prochain créneau du jour même. */
export function creneauCourant(creneaux: Creneau[], maintenant: Date): { enCours: Creneau | null; prochain: Creneau | null } {
  const h = heure(maintenant);
  const duJour = seancesDuJour(creneaux, maintenant);
  return {
    enCours: duJour.find((c) => c.debut <= h && h < c.fin) ?? null,
    prochain: duJour.find((c) => c.debut > h) ?? null,
  };
}

type Plage = Pick<Creneau, 'jour' | 'debut' | 'fin'>;
export function chevauche(a: Plage, b: Plage): boolean {
  return a.jour === b.jour && a.debut < b.fin && b.debut < a.fin;
}

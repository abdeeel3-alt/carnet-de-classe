import type { Eleve } from './types';

export interface Place { rangee: number; colonne: number }
export interface Changement { id: string; rangee: number | null; colonne: number | null }

/** L'élève occupe-t-il une case qui existe dans un plan de cette taille ? */
export function placeValide(e: Pick<Eleve, 'rangee' | 'colonne'>, rangees: number, colonnes: number): boolean {
  return e.rangee !== null && e.colonne !== null && e.rangee >= 0 && e.rangee < rangees && e.colonne >= 0 && e.colonne < colonnes;
}

/**
 * Déplace un élève vers une case (`null` : hors du plan). Sur une case occupée, les deux élèves échangent leurs places.
 * Renvoie uniquement les élèves dont la place change.
 */
export function deplacer(eleves: Eleve[], eleveId: string, cible: Place | null): Changement[] {
  const eleve = eleves.find((e) => e.id === eleveId);
  if (!eleve) return [];
  if (!cible) return eleve.rangee === null && eleve.colonne === null ? [] : [{ id: eleveId, rangee: null, colonne: null }];
  if (eleve.rangee === cible.rangee && eleve.colonne === cible.colonne) return [];
  const changements: Changement[] = [{ id: eleveId, ...cible }];
  const occupant = eleves.find((e) => e.id !== eleveId && !e.deleted && e.rangee === cible.rangee && e.colonne === cible.colonne);
  if (occupant) changements.push({ id: occupant.id, rangee: eleve.rangee, colonne: eleve.colonne });
  return changements;
}

/** Place tous les élèves dans l'ordre des numéros, rangée par rangée ; ceux qui ne tiennent pas restent hors du plan. */
export function placementAuto(eleves: Eleve[], rangees: number, colonnes: number): Changement[] {
  return [...eleves]
    .filter((e) => !e.deleted)
    .sort((a, b) => a.numero - b.numero)
    .map((e, i) => (i < rangees * colonnes ? { id: e.id, rangee: Math.floor(i / colonnes), colonne: i % colonnes } : { id: e.id, rangee: null, colonne: null }));
}

/** « Yassine T. » : le prénom et l'initiale du nom, pour les petites cases. */
export function nomCourt(e: Pick<Eleve, 'nom' | 'prenom'>): string {
  const initiale = e.nom.trim().charAt(0).toUpperCase();
  return e.prenom.trim() ? `${e.prenom.trim()}${initiale ? ` ${initiale}.` : ''}` : e.nom.trim();
}

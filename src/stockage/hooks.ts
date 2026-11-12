import { useLiveQuery } from 'dexie-react-hooks';
import type { Base, NomTable, Parametres } from '../domaine/types';
import { lireParametres, lister, obtenir } from './depot';

/** Liste vivante : se met à jour à chaque écriture locale ou reçue. `undefined` pendant le premier chargement. */
export function useListe<T extends Base>(table: NomTable, filtre: Partial<T> = {}): T[] | undefined {
  return useLiveQuery(() => lister<T>(table, filtre), [table, JSON.stringify(filtre)]);
}

/** Ligne vivante. `null` si elle n'existe pas, `undefined` pendant le chargement. */
export function useLigne<T extends Base>(table: NomTable, id: string | undefined): T | null | undefined {
  return useLiveQuery(async () => (id ? ((await obtenir<T>(table, id)) ?? null) : null), [table, id]);
}

export function useParametres(): Parametres | undefined {
  return useLiveQuery(() => lireParametres(), []);
}

import Dexie, { type Table } from 'dexie';
import type { NomTable } from '../domaine/types';

export interface EnAttente { cle: string; table: NomTable; id: string }
export interface Meta { cle: string; valeur: string }

type TablesDonnees = { [T in NomTable]: Table<any, string> };

class Base extends Dexie {
  classes!: Table<any, string>;
  eleves!: Table<any, string>;
  creneaux!: Table<any, string>;
  seances!: Table<any, string>;
  types_observation!: Table<any, string>;
  observations!: Table<any, string>;
  regles!: Table<any, string>;
  attributions!: Table<any, string>;
  parametres!: Table<any, string>;
  file_attente!: Table<EnAttente, string>;
  meta!: Table<Meta, string>;

  constructor() {
    super('carnet-de-classe');
    this.version(1).stores({
      classes: 'id',
      eleves: 'id, classe_id',
      creneaux: 'id, classe_id, jour',
      seances: 'id, classe_id, debut',
      types_observation: 'id',
      observations: 'id, seance_id, eleve_id, horodatage',
      regles: 'id',
      attributions: 'id, eleve_id',
      parametres: 'id',
      file_attente: 'cle',
      meta: 'cle',
    });
  }
}

export const base = new Base() as Base & TablesDonnees;

/** Champs indexés par table, utilisables pour filtrer sans tout lire. */
export const INDEX: Record<NomTable, string[]> = {
  classes: [], eleves: ['classe_id'], creneaux: ['classe_id', 'jour'], seances: ['classe_id'], types_observation: [],
  observations: ['seance_id', 'eleve_id'], regles: [], attributions: ['eleve_id'], parametres: [],
};

import { reglesDeDepart, typesDeDepart } from '../domaine/catalogue';
import { TABLES, type Base, type NomTable, type Observation, type Parametres } from '../domaine/types';
import { base, INDEX } from './base';

export function nouvelId(): string {
  return crypto.randomUUID();
}

/** Les lignes de départ portent cette date : toute modification réelle, ici ou sur un autre appareil, l'emporte. */
const EPOQUE = '1970-01-01T00:00:00.000Z';
const idDepart = (famille: number, n: number) => `00000000-0000-4000-8000-${String(famille).padStart(4, '0')}${String(n).padStart(8, '0')}`;

let dernierHorodatage = 0;
/** Horodatage strictement croissant sur cet appareil, pour distinguer deux écritures de la même milliseconde. */
function maintenantIso(): string {
  dernierHorodatage = Math.max(Date.now(), dernierHorodatage + 1);
  return new Date(dernierHorodatage).toISOString();
}

const abonnes = new Set<() => void>();
/** Appelle `rappel` après chaque écriture locale. Renvoie la fonction de désabonnement. */
export function abonnerEcritures(rappel: () => void): () => void {
  abonnes.add(rappel);
  return () => abonnes.delete(rappel);
}
const prevenir = () => abonnes.forEach((r) => r());

export async function enregistrer<T extends Base>(table: NomTable, ligne: Omit<T, keyof Base> & Partial<Base>): Promise<T> {
  const complete = { deleted: false, ...ligne, id: ligne.id ?? nouvelId(), updated_at: maintenantIso() } as unknown as T;
  await base.transaction('rw', base[table], base.file_attente, async () => {
    await base[table].put(complete);
    await base.file_attente.put({ cle: `${table}:${complete.id}`, table, id: complete.id });
  });
  prevenir();
  return complete;
}

export async function obtenir<T extends Base>(table: NomTable, id: string): Promise<T | undefined> {
  const ligne = (await base[table].get(id)) as T | undefined;
  return ligne && !ligne.deleted ? ligne : undefined;
}

export async function modifier<T extends Base>(table: NomTable, id: string, changements: Partial<T>): Promise<T | undefined> {
  const actuelle = await base[table].get(id);
  if (!actuelle) return undefined;
  return enregistrer<T>(table, { ...actuelle, ...changements, id });
}

export async function supprimer(table: NomTable, id: string): Promise<void> {
  await modifier<Base>(table, id, { deleted: true });
}

export async function lister<T extends Base>(table: NomTable, filtre: Partial<T> = {}): Promise<T[]> {
  const champs = Object.keys(filtre) as (keyof T & string)[];
  const indexe = champs.find((c) => INDEX[table].includes(c));
  const lignes: T[] = indexe
    ? await base[table].where(indexe).equals(filtre[indexe] as any).toArray()
    : await base[table].toArray();
  return lignes.filter((l) => !l.deleted && champs.every((c) => l[c] === filtre[c]));
}

function anneeScolaire(d: Date): number {
  return d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
}

export function parametresParDefaut(aujourdHui = new Date()): Parametres {
  const a = anneeScolaire(aujourdHui);
  return {
    id: 'parametres', updated_at: EPOQUE, deleted: false,
    semestre1_debut: `${a}-09-01`, semestre1_fin: `${a + 1}-01-31`,
    semestre2_debut: `${a + 1}-02-01`, semestre2_fin: `${a + 1}-07-15`,
    etablissement: '', professeur: '', matiere: 'Mathématiques',
  };
}

/** Pose le catalogue de départ et les paramètres s'ils manquent. Ces lignes ne sont pas envoyées tant qu'elles ne sont pas modifiées. */
export async function initialiser(): Promise<void> {
  await base.transaction('rw', base.types_observation, base.regles, base.parametres, async () => {
    if ((await base.types_observation.count()) === 0 && (await base.regles.count()) === 0) {
      await base.types_observation.bulkPut(typesDeDepart().map((t, i) => ({ ...t, id: idDepart(1, i), updated_at: EPOQUE, deleted: false })));
      await base.regles.bulkPut(reglesDeDepart().map((r, i) => ({ ...r, id: idDepart(2, i), updated_at: EPOQUE, deleted: false })));
    }
    if (!(await base.parametres.get('parametres'))) await base.parametres.put(parametresParDefaut());
  });
}

export async function lireParametres(): Promise<Parametres> {
  return ((await base.parametres.get('parametres')) as Parametres | undefined) ?? parametresParDefaut();
}

export async function annulerDerniereObservation(seanceId: string): Promise<Observation | null> {
  const actives = await lister<Observation>('observations', { seance_id: seanceId } as Partial<Observation>);
  if (!actives.length) return null;
  const derniere = actives.reduce((a, b) => (b.horodatage >= a.horodatage ? b : a));
  await supprimer('observations', derniere.id);
  return derniere;
}

export async function lireMeta(cle: string): Promise<string | undefined> {
  return (await base.meta.get(cle))?.valeur;
}
export async function ecrireMeta(cle: string, valeur: string): Promise<void> {
  await base.meta.put({ cle, valeur });
}

/** Efface toutes les données locales (tests, déconnexion). */
export async function viderBase(): Promise<void> {
  await base.transaction('rw', [...TABLES.map((t) => base[t]), base.file_attente, base.meta], async () => {
    await Promise.all([...TABLES.map((t) => base[t].clear()), base.file_attente.clear(), base.meta.clear()]);
  });
}

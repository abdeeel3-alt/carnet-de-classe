import { useSyncExternalStore } from 'react';
import { TABLES, type Base, type NomTable } from '../domaine/types';
import { base } from './base';
import { abonnerEcritures, ecrireMeta, lireMeta } from './depot';
import type { Distant } from './distant';

export type EtatSynchro = { etat: 'local' | 'synchronise' | 'en_attente' | 'hors_ligne'; enAttente: number };

let etat: EtatSynchro = { etat: 'local', enAttente: 0 };
const ecouteurs = new Set<() => void>();
function publier(suivant: EtatSynchro) {
  if (suivant.etat === etat.etat && suivant.enAttente === etat.enAttente) return;
  etat = suivant;
  ecouteurs.forEach((e) => e());
}
export function useEtatSynchro(): EtatSynchro {
  return useSyncExternalStore((e) => { ecouteurs.add(e); return () => ecouteurs.delete(e); }, () => etat);
}

async function pousser(distant: Distant): Promise<void> {
  const file = await base.file_attente.toArray();
  for (const table of TABLES) {
    const entrees = file.filter((f) => f.table === table);
    if (!entrees.length) continue;
    const lignes = ((await base[table].bulkGet(entrees.map((f) => f.id))) as (Base | undefined)[]).filter((l): l is Base => !!l);
    await distant.pousser(table, lignes);
    // On ne retire de la file que les lignes restées telles qu'envoyées.
    await base.transaction('rw', base[table], base.file_attente, async () => {
      for (const envoyee of lignes) {
        const actuelle = (await base[table].get(envoyee.id)) as Base | undefined;
        if (!actuelle || actuelle.updated_at === envoyee.updated_at) await base.file_attente.delete(`${table}:${envoyee.id}`);
      }
      const orphelines = entrees.filter((f) => !lignes.some((l) => l.id === f.id));
      await base.file_attente.bulkDelete(orphelines.map((f) => f.cle));
    });
  }
}

async function tirer(distant: Distant): Promise<void> {
  for (const table of TABLES) {
    const cle = `curseur:${table}`;
    const { lignes, curseur } = await distant.tirer(table, (await lireMeta(cle)) ?? null);
    if (lignes.length) await appliquer(table, lignes);
    if (curseur) await ecrireMeta(cle, curseur);
  }
}

/** La ligne la plus récente l'emporte ; une ligne reçue n'est jamais remise en file d'attente. */
async function appliquer(table: NomTable, lignes: Base[]): Promise<void> {
  await base.transaction('rw', base[table], async () => {
    for (const distante of lignes) {
      const locale = (await base[table].get(distante.id)) as Base | undefined;
      if (!locale || distante.updated_at > locale.updated_at) await base[table].put(distante);
    }
  });
}

/** Pousse puis tire. Ne lève jamais : un échec réseau laisse la file intacte et l'état « hors ligne ». */
export async function synchroniser(distant: Distant): Promise<void> {
  try {
    await pousser(distant);
    await tirer(distant);
    const enAttente = await base.file_attente.count();
    publier({ etat: enAttente ? 'en_attente' : 'synchronise', enAttente });
  } catch {
    publier({ etat: 'hors_ligne', enAttente: await base.file_attente.count() });
  }
}

/** Synchronise au démarrage, au retour du réseau, au retour sur l'application, 2 s après chaque écriture, et chaque minute. */
export function demarrerSynchro(distant: Distant | null): () => void {
  if (!distant) { publier({ etat: 'local', enAttente: 0 }); return () => {}; }
  let enCours = false;
  let redemander = false;
  let minuteur: ReturnType<typeof setTimeout> | undefined;
  const lancer = async () => {
    if (enCours) { redemander = true; return; }
    enCours = true;
    do { redemander = false; await synchroniser(distant); } while (redemander);
    enCours = false;
  };
  const apresEcriture = () => {
    base.file_attente.count().then((n) => publier({ etat: etat.etat === 'hors_ligne' ? 'hors_ligne' : 'en_attente', enAttente: n }));
    clearTimeout(minuteur);
    minuteur = setTimeout(lancer, 2000);
  };
  const desabonner = abonnerEcritures(apresEcriture);
  const visible = () => { if (document.visibilityState === 'visible') lancer(); };
  window.addEventListener('online', lancer);
  document.addEventListener('visibilitychange', visible);
  const periodique = setInterval(lancer, 60000);
  lancer();
  return () => {
    desabonner();
    clearTimeout(minuteur);
    clearInterval(periodique);
    window.removeEventListener('online', lancer);
    document.removeEventListener('visibilitychange', visible);
  };
}

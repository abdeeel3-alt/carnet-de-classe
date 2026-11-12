import { useSyncExternalStore } from 'react';
import { TABLES, type Base, type NomTable } from '../domaine/types';
import { base } from './base';
import { abonnerEcritures, ecrireMeta, lireMeta } from './depot';
import type { Distant } from './distant';

export type EtatSynchro = { etat: 'local' | 'synchronise' | 'en_attente' | 'hors_ligne' | 'erreur' | 'deconnecte'; enAttente: number; message?: string };

let etat: EtatSynchro = { etat: 'local', enAttente: 0 };
const ecouteurs = new Set<() => void>();
function publier(suivant: EtatSynchro) {
  if (suivant.etat === etat.etat && suivant.enAttente === etat.enAttente && suivant.message === etat.message) return;
  etat = suivant;
  ecouteurs.forEach((e) => e());
}
export const lireEtatSynchro = (): EtatSynchro => etat;
/** L'application est ouverte sur les données locales, sans session : rien ne part tant qu'on ne s'est pas reconnecté. */
export async function signalerDeconnexion(): Promise<void> {
  publier({ etat: 'deconnecte', enAttente: await base.file_attente.count() });
}
export function useEtatSynchro(): EtatSynchro {
  return useSyncExternalStore((e) => { ecouteurs.add(e); return () => ecouteurs.delete(e); }, () => etat);
}

/** Une panne de réseau n'est pas une erreur : la file attend simplement le retour de la connexion. */
function estPanneReseau(e: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  if (e instanceof TypeError) return true;
  return /fetch|network|réseau|hors ligne|timeout|timed out/i.test(e instanceof Error ? e.message : String(e));
}
const messageDe = (e: unknown) => (e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e));

/** Envoie table par table. Un refus sur une table n'empêche pas les autres ; les erreurs sont rendues à l'appelant. */
async function pousser(distant: Distant): Promise<unknown[]> {
  const erreurs: unknown[] = [];
  const file = await base.file_attente.toArray();
  for (const table of TABLES) {
    const entrees = file.filter((f) => f.table === table);
    if (!entrees.length) continue;
    const lignes = ((await base[table].bulkGet(entrees.map((f) => f.id))) as (Base | undefined)[]).filter((l): l is Base => !!l);
    try { await distant.pousser(table, lignes); } catch (e) { erreurs.push(e); if (estPanneReseau(e)) return erreurs; continue; }
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
  return erreurs;
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

/**
 * Pousse puis tire. Ne lève jamais. Une panne de réseau laisse la file intacte et l'état « hors ligne » ;
 * un refus du serveur est signalé comme une erreur, avec son message, sans bloquer le reste.
 */
export async function synchroniser(distant: Distant): Promise<void> {
  const erreurs: unknown[] = [];
  try {
    erreurs.push(...(await pousser(distant)));
    if (!erreurs.some(estPanneReseau)) await tirer(distant);
  } catch (e) {
    erreurs.push(e);
  }
  const enAttente = await base.file_attente.count();
  if (erreurs.some(estPanneReseau)) publier({ etat: 'hors_ligne', enAttente });
  else if (erreurs.length) publier({ etat: 'erreur', enAttente, message: messageDe(erreurs[0]) });
  else publier({ etat: enAttente ? 'en_attente' : 'synchronise', enAttente });
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
    base.file_attente.count().then((n) => publier(etat.etat === 'hors_ligne' || etat.etat === 'erreur' ? { ...etat, enAttente: n } : { etat: 'en_attente', enAttente: n }));
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

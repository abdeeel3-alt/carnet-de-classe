import { beforeEach } from 'vitest';
import type { Base, Classe, NomTable } from '../domaine/types';
import { base } from './base';
import { enregistrer, lireMeta, lister, obtenir, supprimer, viderBase } from './depot';
import type { Distant } from './distant';
import { lireEtatSynchro, synchroniser } from './synchro';

/** Serveur factice : garde la ligne la plus récente et numérote les écritures pour le curseur. */
function distantFactice() {
  const tables = new Map<NomTable, Map<string, Base & { ordre: number }>>();
  let ordre = 0;
  const etat = { enLigne: true, curseursRecus: [] as (string | null)[] };
  const table = (t: NomTable) => tables.get(t) ?? tables.set(t, new Map()).get(t)!;
  const ecrire = (t: NomTable, l: Base) => {
    const actuelle = table(t).get(l.id);
    if (actuelle && actuelle.updated_at >= l.updated_at) return;
    table(t).set(l.id, { ...l, ordre: ++ordre });
  };
  const distant: Distant = {
    async pousser(t, lignes) {
      if (!etat.enLigne) throw new Error('hors ligne');
      lignes.forEach((l) => ecrire(t, l));
    },
    async tirer(t, curseur) {
      if (!etat.enLigne) throw new Error('hors ligne');
      if (t === 'classes') etat.curseursRecus.push(curseur);
      const depuis = curseur ? Number(curseur) : 0;
      const lignes = [...table(t).values()].filter((l) => l.ordre > depuis).sort((a, b) => a.ordre - b.ordre);
      return { lignes: lignes.map(({ ordre: _o, ...l }) => l), curseur: lignes.length ? String(lignes.at(-1)!.ordre) : curseur };
    },
  };
  return { distant, etat, ecrire, lire: (t: NomTable, id: string) => table(t).get(id) };
}

const classe = { nom: '3AC-2', niveau: '3AC' as const, annee: '2026-2027', archivee: false, plan_rangees: 5, plan_colonnes: 6 };
const ligneDistante = (id: string, nom: string, updated_at: string, deleted = false): Classe => ({ ...classe, id, nom, updated_at, deleted });

beforeEach(viderBase);

test('pousse les lignes en attente et vide la file', async () => {
  const d = distantFactice();
  const c = await enregistrer<Classe>('classes', classe);
  await synchroniser(d.distant);
  expect(d.lire('classes', c.id)).toMatchObject({ nom: '3AC-2' });
  expect(await base.file_attente.count()).toBe(0);
});
test('hors ligne : la file est conservée, sans erreur, puis envoyée au retour', async () => {
  const d = distantFactice();
  d.etat.enLigne = false;
  const c = await enregistrer<Classe>('classes', classe);
  await expect(synchroniser(d.distant)).resolves.toBeUndefined();
  expect(await base.file_attente.count()).toBe(1);
  d.etat.enLigne = true;
  await synchroniser(d.distant);
  expect(d.lire('classes', c.id)).toBeTruthy();
  expect(await base.file_attente.count()).toBe(0);
});
test('rechargement hors ligne : les changements en attente survivent et partent ensuite', async () => {
  const d = distantFactice();
  d.etat.enLigne = false;
  const c = await enregistrer<Classe>('classes', classe);
  await synchroniser(d.distant);
  base.close();
  await base.open();
  expect(await base.file_attente.count()).toBe(1);
  d.etat.enLigne = true;
  await synchroniser(d.distant);
  expect(d.lire('classes', c.id)).toBeTruthy();
});
test('une suppression est poussée comme ligne supprimée', async () => {
  const d = distantFactice();
  const c = await enregistrer<Classe>('classes', classe);
  await supprimer('classes', c.id);
  await synchroniser(d.distant);
  expect(d.lire('classes', c.id)!.deleted).toBe(true);
});
test('tire : une ligne distante plus récente remplace la locale', async () => {
  const d = distantFactice();
  const c = await enregistrer<Classe>('classes', classe);
  await synchroniser(d.distant);
  d.ecrire('classes', ligneDistante(c.id, 'Renommée ailleurs', '2999-01-01T00:00:00.000Z'));
  await synchroniser(d.distant);
  expect((await obtenir<Classe>('classes', c.id))!.nom).toBe('Renommée ailleurs');
});
test('tire : une ligne distante plus ancienne que la locale est ignorée', async () => {
  const d = distantFactice();
  d.ecrire('classes', ligneDistante('x1', 'Ancienne', '2000-01-01T00:00:00.000Z'));
  await enregistrer<Classe>('classes', { ...classe, id: 'x1', nom: 'Locale récente' });
  d.etat.enLigne = true;
  // on tire sans avoir poussé : simulé en vidant la file
  await base.file_attente.clear();
  await synchroniser(d.distant);
  expect((await obtenir<Classe>('classes', 'x1'))!.nom).toBe('Locale récente');
});
test('tire : une ligne distante supprimée disparaît des listes', async () => {
  const d = distantFactice();
  const c = await enregistrer<Classe>('classes', classe);
  await synchroniser(d.distant);
  d.ecrire('classes', ligneDistante(c.id, '3AC-2', '2999-01-01T00:00:00.000Z', true));
  await synchroniser(d.distant);
  expect(await lister('classes')).toEqual([]);
});
test('une ligne tirée n’est pas remise en file d’attente', async () => {
  const d = distantFactice();
  d.ecrire('classes', ligneDistante('x2', 'Venue d’ailleurs', '2026-11-01T00:00:00.000Z'));
  await synchroniser(d.distant);
  expect((await obtenir<Classe>('classes', 'x2'))!.nom).toBe('Venue d’ailleurs');
  expect(await base.file_attente.count()).toBe(0);
});
test('le curseur est mémorisé par table et repassé à l’appel suivant', async () => {
  const d = distantFactice();
  d.ecrire('classes', ligneDistante('x3', 'A', '2026-11-01T00:00:00.000Z'));
  await synchroniser(d.distant);
  await synchroniser(d.distant);
  expect(d.etat.curseursRecus).toEqual([null, '1']);
  expect(await lireMeta('curseur:classes')).toBe('1');
});
test('une ligne modifiée pendant l’envoi reste en file', async () => {
  const d = distantFactice();
  const c = await enregistrer<Classe>('classes', classe);
  const pousser = d.distant.pousser;
  d.distant.pousser = async (t, lignes) => {
    await pousser(t, lignes);
    if (t === 'classes') { d.distant.pousser = pousser; await enregistrer<Classe>('classes', { ...classe, id: c.id, nom: 'Modifiée entre-temps' }); }
  };
  await synchroniser(d.distant);
  expect(await base.file_attente.count()).toBe(1);
  await synchroniser(d.distant);
  expect(d.lire('classes', c.id)).toMatchObject({ nom: 'Modifiée entre-temps' });
});

test('un refus du serveur sur une table n’empêche ni les autres envois ni la réception, et il est signalé', async () => {
  const d = distantFactice();
  const c = await enregistrer<Classe>('classes', classe);
  const e = await enregistrer('eleves', { classe_id: c.id, numero: 1, nom: 'ALAOUI', prenom: 'Sara', rangee: null, colonne: null, remarques: '' } as never);
  d.ecrire('regles', { id: 'r-distante', updated_at: '2026-11-01T00:00:00.000Z', deleted: false });
  const pousser = d.distant.pousser;
  d.distant.pousser = async (t, lignes) => { if (t === 'classes') throw new Error('new row violates check constraint'); return pousser(t, lignes); };
  await synchroniser(d.distant);
  expect(d.lire('eleves', e.id)).toBeTruthy();
  expect(await obtenir('regles', 'r-distante')).toBeTruthy();
  expect(await base.file_attente.toArray()).toEqual([expect.objectContaining({ table: 'classes' })]);
  expect(lireEtatSynchro()).toMatchObject({ etat: 'erreur', enAttente: 1 });
  expect(lireEtatSynchro().message).toContain('check constraint');
});
test('une panne de réseau est annoncée comme « hors ligne », pas comme une erreur', async () => {
  const d = distantFactice();
  await enregistrer<Classe>('classes', classe);
  d.distant.pousser = async () => { throw new TypeError('Failed to fetch'); };
  d.distant.tirer = async () => { throw new TypeError('Failed to fetch'); };
  await synchroniser(d.distant);
  expect(lireEtatSynchro()).toMatchObject({ etat: 'hors_ligne', enAttente: 1 });
});
test('après une erreur corrigée, l’état redevient « synchronisé »', async () => {
  const d = distantFactice();
  await enregistrer<Classe>('classes', classe);
  const pousser = d.distant.pousser;
  d.distant.pousser = async () => { throw new Error('refus'); };
  await synchroniser(d.distant);
  d.distant.pousser = pousser;
  await synchroniser(d.distant);
  expect(lireEtatSynchro()).toEqual({ etat: 'synchronise', enAttente: 0 });
});

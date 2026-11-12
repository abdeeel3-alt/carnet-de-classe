import { beforeEach } from 'vitest';
import type { Classe, Observation, Regle, TypeObservation } from '../domaine/types';
import { base } from './base';
import { annulerDerniereObservation, enregistrer, initialiser, lister, modifier, obtenir, supprimer, viderBase } from './depot';

beforeEach(viderBase);

const classe = { nom: '3AC-2', niveau: '3AC' as const, annee: '2026-2027', archivee: false, plan_rangees: 5, plan_colonnes: 6 };

test('enregistrer pose id, updated_at et deleted, et met la ligne en file d’attente', async () => {
  const c = await enregistrer<Classe>('classes', classe);
  expect(c.id).toMatch(/^[0-9a-f-]{36}$/);
  expect(new Date(c.updated_at).toISOString()).toBe(c.updated_at);
  expect(c.deleted).toBe(false);
  expect(await base.file_attente.get(`classes:${c.id}`)).toEqual({ cle: `classes:${c.id}`, table: 'classes', id: c.id });
});
test('deux enregistrements de la même ligne : une seule entrée en file', async () => {
  const c = await enregistrer<Classe>('classes', classe);
  await modifier<Classe>('classes', c.id, { nom: '3AC-3' });
  expect(await base.file_attente.count()).toBe(1);
  expect((await obtenir<Classe>('classes', c.id))!.nom).toBe('3AC-3');
});
test('supprimer marque la ligne et lister ne la renvoie plus', async () => {
  const c = await enregistrer<Classe>('classes', classe);
  await supprimer('classes', c.id);
  expect(await lister('classes')).toEqual([]);
  expect((await base.classes.get(c.id)).deleted).toBe(true);
});
test('lister filtre par champ', async () => {
  const a = await enregistrer<Classe>('classes', classe);
  await enregistrer<Classe>('classes', { ...classe, nom: '2AC-1', niveau: '2AC' });
  expect((await lister<Classe>('classes', { niveau: '3AC' })).map((c) => c.id)).toEqual([a.id]);
});
test('initialiser deux fois : 14 types, 5 règles, une ligne de paramètres, rien en file', async () => {
  await initialiser();
  await initialiser();
  expect(await lister<TypeObservation>('types_observation')).toHaveLength(14);
  expect(await lister<Regle>('regles')).toHaveLength(5);
  expect(await obtenir('parametres', 'parametres')).toBeTruthy();
  expect(await base.file_attente.count()).toBe(0);
});
test('le catalogue de départ a les mêmes identifiants sur tous les appareils', async () => {
  await initialiser();
  const premiers = (await lister<TypeObservation>('types_observation')).map((t) => t.id).sort();
  await viderBase();
  await initialiser();
  expect((await lister<TypeObservation>('types_observation')).map((t) => t.id).sort()).toEqual(premiers);
});
test('annuler retire la dernière observation de la séance', async () => {
  const o = (h: string, seance_id = 's1') => enregistrer<Observation>('observations', {
    seance_id, eleve_id: 'e1', type_id: 't', critere: 'discipline', code: null, libelle: 'Bavardage', points: -1, horodatage: h,
  });
  const premiere = await o('2026-11-12T08:00:00.000Z');
  const derniere = await o('2026-11-12T08:05:00.000Z');
  await o('2026-11-12T09:00:00.000Z', 's2');
  expect((await annulerDerniereObservation('s1'))!.id).toBe(derniere.id);
  expect((await lister<Observation>('observations', { seance_id: 's1' })).map((x) => x.id)).toEqual([premiere.id]);
  await annulerDerniereObservation('s1');
  expect(await annulerDerniereObservation('s1')).toBeNull();
});

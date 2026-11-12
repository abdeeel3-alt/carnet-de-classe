import { beforeEach } from 'vitest';
import type { Observation, TypeObservation } from '../../domaine/types';
import { initialiser, lister, modifier, viderBase } from '../../stockage/depot';
import { annulerDerniereAction, basculerPresence, observer } from './actions';

let types: TypeObservation[] = [];
const type = (libelle: string) => types.find((t) => t.libelle === libelle)!;
const actives = () => lister<Observation>('observations', { seance_id: 's1' });

beforeEach(async () => {
  await viderBase();
  await initialiser();
  types = await lister<TypeObservation>('types_observation');
});

test('observer crée une observation par élève avec les points du type', async () => {
  const crees = await observer('s1', ['e1', 'e2', 'e3'], type('Téléphone en classe'));
  expect(crees).toHaveLength(3);
  expect(await actives()).toHaveLength(3);
  expect(crees[0]).toMatchObject({ seance_id: 's1', eleve_id: 'e1', critere: 'reglement', libelle: 'Téléphone en classe', points: -2, code: null });
});
test('modifier les points du type ne change pas les observations déjà saisies', async () => {
  await observer('s1', ['e1'], type('Bavardage'));
  await modifier<TypeObservation>('types_observation', type('Bavardage').id, { points: -5 });
  expect((await actives())[0].points).toBe(-1);
});
test('un second appui sur Absent retire l’absence', async () => {
  await basculerPresence('s1', 'e1', type('Absent'));
  expect((await actives()).map((o) => o.code)).toEqual(['absent']);
  await basculerPresence('s1', 'e1', type('Absent'));
  expect(await actives()).toEqual([]);
});
test('absent puis retard : seul le retard reste', async () => {
  await basculerPresence('s1', 'e1', type('Absent'));
  await basculerPresence('s1', 'e1', type('Retard'));
  expect((await actives()).map((o) => o.code)).toEqual(['retard']);
});
test('la présence d’un élève ne touche pas celle d’un autre', async () => {
  await basculerPresence('s1', 'e1', type('Absent'));
  await basculerPresence('s1', 'e2', type('Retard'));
  expect((await actives()).map((o) => `${o.eleve_id}:${o.code}`).sort()).toEqual(['e1:absent', 'e2:retard']);
});
test('annuler retire toute la dernière action, même appliquée à plusieurs élèves', async () => {
  await observer('s1', ['e1'], type('Bavardage'));
  await new Promise((r) => setTimeout(r, 5));
  await observer('s1', ['e2', 'e3'], type('Sans uniforme'));
  expect(await annulerDerniereAction('s1')).toHaveLength(2);
  expect((await actives()).map((o) => o.eleve_id)).toEqual(['e1']);
  await annulerDerniereAction('s1');
  expect(await annulerDerniereAction('s1')).toEqual([]);
});

import { beforeEach } from 'vitest';
import type { Creneau, Seance } from '../domaine/types';
import { lister, modifier, viderBase } from './depot';
import { ouvrirSeance } from './seances';

beforeEach(viderBase);
const t0 = new Date(2026, 10, 9, 8, 5);
const plus = (minutes: number) => new Date(t0.getTime() + minutes * 60000);
const creneau: Creneau = { id: 'cr1', updated_at: '', deleted: false, jour: 1, debut: '08:00', fin: '09:00', classe_id: 'c1', salle: '7' };

test('double appui : une seule séance', async () => {
  const [a, b] = await Promise.all([ouvrirSeance('c1', t0, null), ouvrirSeance('c1', t0, null)]);
  expect(a.id).toBe(b.id);
  expect(await lister('seances')).toHaveLength(1);
});
test('reprise dans les 2 heures', async () => {
  const a = await ouvrirSeance('c1', t0, null);
  expect((await ouvrirSeance('c1', plus(119), null)).id).toBe(a.id);
});
test('nouvelle séance après 2 heures', async () => {
  const a = await ouvrirSeance('c1', t0, null);
  expect((await ouvrirSeance('c1', plus(121), null)).id).not.toBe(a.id);
  expect(await lister('seances')).toHaveLength(2);
});
test('une séance terminée récente est rouverte', async () => {
  const a = await ouvrirSeance('c1', t0, null);
  await modifier<Seance>('seances', a.id, { terminee: true });
  const b = await ouvrirSeance('c1', plus(30), null);
  expect(b.id).toBe(a.id);
  expect(b.terminee).toBe(false);
});
test('avec un créneau : la séance du même créneau et du même jour est reprise, même après 2 heures', async () => {
  const a = await ouvrirSeance('c1', t0, creneau);
  expect(a.creneau_id).toBe('cr1');
  expect((await ouvrirSeance('c1', plus(200), creneau)).id).toBe(a.id);
});
test('le même créneau la semaine suivante : nouvelle séance', async () => {
  const a = await ouvrirSeance('c1', t0, creneau);
  expect((await ouvrirSeance('c1', plus(7 * 24 * 60), creneau)).id).not.toBe(a.id);
});
test('les classes ne partagent pas leurs séances', async () => {
  const a = await ouvrirSeance('c1', t0, null);
  expect((await ouvrirSeance('c2', t0, null)).id).not.toBe(a.id);
});

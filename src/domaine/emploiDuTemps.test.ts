import { chevauche, creneauCourant, seancesDuJour } from './emploiDuTemps';
import { local } from './fabriques-test';
import type { Creneau } from './types';

const c = (id: string, jour: Creneau['jour'], debut: string, fin: string, extra: Partial<Creneau> = {}): Creneau =>
  ({ id, updated_at: '', deleted: false, jour, debut, fin, classe_id: 'k', salle: '', ...extra });
const c1 = c('c1', 1, '08:00', '09:00');
const c2 = c('c2', 1, '10:00', '12:00');
const c3 = c('c3', 2, '08:00', '10:00');
const tous = [c2, c3, c1];
const lundi = (h: number, m = 0) => local(2026, 11, 9, h, m);

test('séances du jour triées par heure', () => {
  expect(seancesDuJour(tous, lundi(7)).map((x) => x.id)).toEqual(['c1', 'c2']);
  expect(seancesDuJour(tous, local(2026, 11, 10, 7)).map((x) => x.id)).toEqual(['c3']);
});
test('pendant un créneau', () => {
  expect(creneauCourant(tous, lundi(8, 30))).toEqual({ enCours: c1, prochain: c2 });
});
test('entre deux créneaux', () => {
  expect(creneauCourant(tous, lundi(9, 30))).toEqual({ enCours: null, prochain: c2 });
});
test('début inclus, fin exclue', () => {
  expect(creneauCourant(tous, lundi(8, 0)).enCours).toBe(c1);
  expect(creneauCourant(tous, lundi(9, 0)).enCours).toBeNull();
});
test('après le dernier créneau : pas de prochain le jour même', () => {
  expect(creneauCourant(tous, lundi(13))).toEqual({ enCours: null, prochain: null });
});
test('dimanche : rien', () => {
  const dimanche = local(2026, 11, 15, 9);
  expect(seancesDuJour(tous, dimanche)).toEqual([]);
  expect(creneauCourant(tous, dimanche)).toEqual({ enCours: null, prochain: null });
});
test('ignore les créneaux supprimés', () => {
  expect(seancesDuJour([{ ...c1, deleted: true }, c2], lundi(7)).map((x) => x.id)).toEqual(['c2']);
});
test('chevauchement', () => {
  expect(chevauche(c1, c(' ', 1, '08:30', '09:30'))).toBe(true);
  expect(chevauche(c1, c(' ', 1, '09:00', '10:00'))).toBe(false);
  expect(chevauche(c1, c(' ', 2, '08:00', '09:00'))).toBe(false);
});

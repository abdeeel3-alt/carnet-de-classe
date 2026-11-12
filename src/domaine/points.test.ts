import { local, obs } from './fabriques-test';
import { calculerTotaux, totauxVides } from './points';

test('additionne par critère et compte absences et retards à part', () => {
  const t = calculerTotaux([
    obs('e1', 'participation', 1), obs('e1', 'participation', 2), obs('e1', 'discipline', -1),
    obs('e1', 'presence', 0, { code: 'absent' }), obs('e1', 'presence', 0, { code: 'retard' }),
  ]).get('e1')!;
  expect(t.parCritere.participation).toBe(3);
  expect(t.parCritere.discipline).toBe(-1);
  expect(t.total).toBe(2);
  expect(t.absences).toBe(1);
  expect(t.retards).toBe(1);
});
test('ignore les observations supprimées', () => {
  expect(calculerTotaux([obs('e1', 'serieux', 1, { deleted: true })]).size).toBe(0);
});
test('ignore les observations hors intervalle', () => {
  const i = { debut: local(2026, 11, 1), fin: local(2026, 11, 30, 23, 59, 59, 999) };
  const t = calculerTotaux([
    obs('e1', 'serieux', 1),
    obs('e1', 'serieux', 5, { horodatage: local(2026, 10, 31, 12).toISOString() }),
  ], i).get('e1')!;
  expect(t.parCritere.serieux).toBe(1);
});
test('un retard pénalisé compte en points de présence et en retard', () => {
  const t = calculerTotaux([obs('e1', 'presence', -1, { code: 'retard' })]).get('e1')!;
  expect(t.parCritere.presence).toBe(-1);
  expect(t.total).toBe(-1);
  expect(t.retards).toBe(1);
});
test('sépare les élèves ; liste vide -> aucun total', () => {
  const m = calculerTotaux([obs('e1', 'serieux', 1), obs('e2', 'serieux', -1)]);
  expect(m.get('e1')!.total).toBe(1);
  expect(m.get('e2')!.total).toBe(-1);
  expect(calculerTotaux([]).size).toBe(0);
  expect(totauxVides().total).toBe(0);
});

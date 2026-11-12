import { clePeriode, dansIntervalle, intervalleRegle, resoudrePeriode } from './periodes';
import type { Parametres } from './types';

const local = (a: number, m: number, j: number, h = 0, mi = 0, s = 0, ms = 0) => new Date(a, m - 1, j, h, mi, s, ms);
const p: Parametres = {
  id: 'parametres', updated_at: '', deleted: false,
  semestre1_debut: '2026-09-07', semestre1_fin: '2027-01-24',
  semestre2_debut: '2027-01-25', semestre2_fin: '2027-06-30',
  etablissement: '', professeur: '', matiere: '',
};
const jeudi = local(2026, 11, 12, 10, 30);

test('semaine : du lundi au dimanche', () => {
  expect(resoudrePeriode({ type: 'semaine' }, jeudi, p)).toEqual({ debut: local(2026, 11, 9), fin: local(2026, 11, 15, 23, 59, 59, 999) });
});
test('semaine vue un dimanche : celle du lundi précédent', () => {
  expect(resoudrePeriode({ type: 'semaine' }, local(2026, 11, 15, 10), p).debut).toEqual(local(2026, 11, 9));
});
test('mois', () => {
  expect(resoudrePeriode({ type: 'mois' }, jeudi, p)).toEqual({ debut: local(2026, 11, 1), fin: local(2026, 11, 30, 23, 59, 59, 999) });
});
test('semestres et année', () => {
  expect(resoudrePeriode({ type: 'semestre1' }, jeudi, p)).toEqual({ debut: local(2026, 9, 7), fin: local(2027, 1, 24, 23, 59, 59, 999) });
  expect(resoudrePeriode({ type: 'semestre2' }, jeudi, p).debut).toEqual(local(2027, 1, 25));
  expect(resoudrePeriode({ type: 'annee' }, jeudi, p)).toEqual({ debut: local(2026, 9, 7), fin: local(2027, 6, 30, 23, 59, 59, 999) });
});
test('dates au choix, bornes incluses', () => {
  const i = resoudrePeriode({ type: 'dates', debut: '2026-10-01', fin: '2026-10-15' }, jeudi, p);
  expect(i).toEqual({ debut: local(2026, 10, 1), fin: local(2026, 10, 15, 23, 59, 59, 999) });
});
test('dates au choix inversées : remises dans l’ordre', () => {
  const i = resoudrePeriode({ type: 'dates', debut: '2026-10-15', fin: '2026-10-01' }, jeudi, p);
  expect(i.debut).toEqual(local(2026, 10, 1));
});
test('clés de période', () => {
  expect(clePeriode('semaine', jeudi, p)).toBe('2026-S46');
  expect(clePeriode('mois', jeudi, p)).toBe('2026-11');
  expect(clePeriode('semestre', jeudi, p)).toBe('semestre1');
  expect(clePeriode('semestre', local(2027, 3, 1), p)).toBe('semestre2');
  expect(clePeriode('semaine', local(2027, 1, 1), p)).toBe('2026-S53');
});
test('date hors semestres : rattachée au plus proche', () => {
  expect(clePeriode('semestre', local(2026, 8, 20), p)).toBe('semestre1');
  expect(clePeriode('semestre', local(2027, 7, 10), p)).toBe('semestre2');
});
test('intervalleRegle suit la période de la règle', () => {
  expect(intervalleRegle('mois', jeudi, p).debut).toEqual(local(2026, 11, 1));
  expect(intervalleRegle('semestre', jeudi, p).fin).toEqual(local(2027, 1, 24, 23, 59, 59, 999));
  expect(intervalleRegle('semaine', jeudi, p).debut).toEqual(local(2026, 11, 9));
});
test('dansIntervalle : fin de dimanche incluse, lundi suivant exclu', () => {
  const s = resoudrePeriode({ type: 'semaine' }, jeudi, p);
  expect(dansIntervalle(local(2026, 11, 15, 23, 59).toISOString(), s)).toBe(true);
  expect(dansIntervalle(local(2026, 11, 16).toISOString(), s)).toBe(false);
});

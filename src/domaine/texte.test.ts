import { distance, normaliser } from './texte';

test('normaliser : minuscules, sans accents ni ponctuation, espaces réduits', () => {
  expect(normaliser('  Éléve-N°12 ')).toBe('eleve n 12');
  expect(normaliser("Pas d'uniforme !")).toBe('pas d uniforme');
  expect(normaliser('النسب')).toBe('النسب');
});
test('distance de Levenshtein', () => {
  expect(distance('salma', 'selma')).toBe(1);
  expect(distance('omar', 'omar')).toBe(0);
  expect(distance('', 'abc')).toBe(3);
  expect(distance('yassine', 'yasin')).toBe(2);
});

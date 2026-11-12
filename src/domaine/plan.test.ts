import { eleve } from './fabriques-test';
import { deplacer, placementAuto, placeValide } from './plan';

const e = (n: number, rangee: number | null, colonne: number | null) => eleve(n, `P${n}`, `N${n}`, { rangee, colonne });

test('placer un élève sur une case libre', () => {
  expect(deplacer([e(1, null, null)], 'e1', { rangee: 2, colonne: 3 })).toEqual([{ id: 'e1', rangee: 2, colonne: 3 }]);
});
test('déposer sur une case occupée échange les deux élèves', () => {
  const classe = [e(1, 0, 0), e(2, 1, 1)];
  expect(deplacer(classe, 'e1', { rangee: 1, colonne: 1 })).toEqual([{ id: 'e1', rangee: 1, colonne: 1 }, { id: 'e2', rangee: 0, colonne: 0 }]);
});
test('un élève non placé déposé sur une case occupée : l’occupant redevient non placé', () => {
  const classe = [e(1, null, null), e(2, 1, 1)];
  expect(deplacer(classe, 'e1', { rangee: 1, colonne: 1 })).toEqual([{ id: 'e1', rangee: 1, colonne: 1 }, { id: 'e2', rangee: null, colonne: null }]);
});
test('retirer du plan', () => {
  expect(deplacer([e(1, 0, 0)], 'e1', null)).toEqual([{ id: 'e1', rangee: null, colonne: null }]);
});
test('déposer sur sa propre case : aucun changement', () => {
  expect(deplacer([e(1, 0, 0)], 'e1', { rangee: 0, colonne: 0 })).toEqual([]);
});
test('placement automatique dans l’ordre des numéros, rangée par rangée', () => {
  const classe = [e(3, null, null), e(1, 4, 4), e(2, null, null)];
  expect(placementAuto(classe, 2, 2)).toEqual([
    { id: 'e1', rangee: 0, colonne: 0 }, { id: 'e2', rangee: 0, colonne: 1 }, { id: 'e3', rangee: 1, colonne: 0 },
  ]);
});
test('placement automatique : les élèves en trop restent non placés', () => {
  const classe = [e(1, null, null), e(2, null, null), e(3, 0, 0)];
  expect(placementAuto(classe, 1, 2)).toEqual([
    { id: 'e1', rangee: 0, colonne: 0 }, { id: 'e2', rangee: 0, colonne: 1 }, { id: 'e3', rangee: null, colonne: null },
  ]);
});
test('une place hors du plan n’est pas valide', () => {
  expect(placeValide(e(1, 4, 0), 4, 6)).toBe(false);
  expect(placeValide(e(1, 3, 5), 4, 6)).toBe(true);
  expect(placeValide(e(1, null, null), 4, 6)).toBe(false);
});

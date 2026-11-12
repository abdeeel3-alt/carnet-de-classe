import { attribution, local, obs, parametresTest as p, regle } from './fabriques-test';
import { totauxVides, type Totaux } from './points';
import { atteint, decrireRegle, proposer, seuilSigne } from './regles';
import type { Critere } from './types';

const totaux = (c: Partial<Record<Critere, number>>): Totaux => {
  const t = totauxVides();
  for (const [k, v] of Object.entries(c)) { t.parCritere[k as Critere] = v!; t.total += v!; }
  return t;
};
const jeudi = local(2026, 11, 12, 10);

describe('atteint', () => {
  test('badge : valeur supérieure ou égale au seuil', () => {
    const r = regle({ type: 'badge', cible: 'participation', seuil: 10 });
    expect(atteint(r, totaux({ participation: 10 }))).toBe(true);
    expect(atteint(r, totaux({ participation: 9 }))).toBe(false);
  });
  test('sanction à seuil négatif : valeur inférieure ou égale au seuil', () => {
    const r = regle({ type: 'sanction', cible: 'discipline', seuil: -5 });
    expect(atteint(r, totaux({ discipline: -5 }))).toBe(true);
    expect(atteint(r, totaux({ discipline: -6 }))).toBe(true);
    expect(atteint(r, totaux({ discipline: -4 }))).toBe(false);
    expect(atteint(r, totaux({ discipline: 3 }))).toBe(false);
  });
  test('compteurs de retards et d’absences', () => {
    expect(atteint(regle({ type: 'sanction', cible: 'retards', seuil: 3 }), { ...totauxVides(), retards: 3 })).toBe(true);
    expect(atteint(regle({ type: 'sanction', cible: 'retards', seuil: 3 }), { ...totauxVides(), retards: 2 })).toBe(false);
    expect(atteint(regle({ type: 'sanction', cible: 'absences', seuil: 2 }), { ...totauxVides(), absences: 2 })).toBe(true);
  });
  test('total général', () => {
    expect(atteint(regle({ type: 'badge', cible: 'total', seuil: 20 }), totaux({ participation: 15, serieux: 5 }))).toBe(true);
  });
});

describe('proposer', () => {
  const avertissement = regle({ nom: 'Avertissement', type: 'sanction', cible: 'discipline', seuil: -5, periode: 'mois' });
  const cinqBavardages = Array.from({ length: 5 }, () => obs('e1', 'discipline', -1));

  test('propose quand le seuil est atteint sur la période', () => {
    expect(proposer([avertissement], cinqBavardages, [], jeudi, p)).toEqual([
      { eleve_id: 'e1', regle_id: avertissement.id, libelle: 'Avertissement', type: 'sanction', cle_periode: '2026-11' },
    ]);
  });
  test('ne propose rien à −4', () => {
    expect(proposer([avertissement], cinqBavardages.slice(0, 4), [], jeudi, p)).toEqual([]);
  });
  test.each(['proposee', 'validee', 'refusee'] as const)('ne repropose pas une attribution %s de la même période', (etat) => {
    const deja = attribution({ eleve_id: 'e1', regle_id: avertissement.id, etat, cle_periode: '2026-11' });
    expect(proposer([avertissement], cinqBavardages, [deja], jeudi, p)).toEqual([]);
  });
  test('repropose à la période suivante', () => {
    const deja = attribution({ eleve_id: 'e1', regle_id: avertissement.id, etat: 'refusee', cle_periode: '2026-10' });
    expect(proposer([avertissement], cinqBavardages, [deja], jeudi, p)).toHaveLength(1);
  });
  test('une attribution supprimée ne bloque pas', () => {
    const deja = attribution({ eleve_id: 'e1', regle_id: avertissement.id, etat: 'validee', cle_periode: '2026-11', deleted: true });
    expect(proposer([avertissement], cinqBavardages, [deja], jeudi, p)).toHaveLength(1);
  });
  test('les observations du mois précédent ne comptent pas pour une règle mensuelle', () => {
    const octobre = cinqBavardages.map((o) => ({ ...o, horodatage: local(2026, 10, 20, 9).toISOString() }));
    expect(proposer([avertissement], octobre, [], jeudi, p)).toEqual([]);
  });
  test('ignore les règles supprimées', () => {
    expect(proposer([{ ...avertissement, deleted: true }], cinqBavardages, [], jeudi, p)).toEqual([]);
  });
});

describe('seuilSigne', () => {
  test('sanction sur un critère ou sur le total : seuil négatif', () => {
    expect(seuilSigne('sanction', 'discipline', 5)).toBe(-5);
    expect(seuilSigne('sanction', 'total', -8)).toBe(-8);
  });
  test('badge, ou compteur d’absences et de retards : seuil positif', () => {
    expect(seuilSigne('badge', 'participation', 10)).toBe(10);
    expect(seuilSigne('badge', 'total', -10)).toBe(10);
    expect(seuilSigne('sanction', 'retards', 3)).toBe(3);
    expect(seuilSigne('sanction', 'absences', -2)).toBe(2);
  });
  test('description lisible', () => {
    expect(decrireRegle(regle({ type: 'sanction', cible: 'discipline', seuil: -5, periode: 'mois' }))).toBe('−5 en Discipline sur le mois');
    expect(decrireRegle(regle({ type: 'sanction', cible: 'retards', seuil: 3, periode: 'mois' }))).toBe('3 retards sur le mois');
    expect(decrireRegle(regle({ type: 'badge', cible: 'total', seuil: 20, periode: 'semestre' }))).toBe('+20 au total sur le semestre');
    expect(decrireRegle(regle({ type: 'sanction', cible: 'absences', seuil: 1, periode: 'semaine' }))).toBe('1 absence sur la semaine');
  });
});

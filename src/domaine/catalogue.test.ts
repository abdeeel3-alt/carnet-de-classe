import { reglesDeDepart, typesDeDepart } from './catalogue';

test('catalogue de départ conforme à la spec', () => {
  const t = typesDeDepart();
  expect(t).toHaveLength(14);
  const p = (l: string) => t.find((x) => x.libelle === l)!;
  expect(p('Absent')).toMatchObject({ critere: 'presence', points: 0, code: 'absent' });
  expect(p('Retard')).toMatchObject({ critere: 'presence', points: 0, code: 'retard' });
  expect(p('Sans uniforme').points).toBe(-1);
  expect(p('Téléphone en classe').points).toBe(-2);
  expect(p('Excellente réponse').points).toBe(2);
  expect(p('Manque de respect').points).toBe(-3);
});

test('règles de départ conformes à la spec', () => {
  const r = reglesDeDepart();
  expect(r).toContainEqual({ nom: 'Participant actif', type: 'badge', cible: 'participation', seuil: 10, periode: 'mois' });
  expect(r).toContainEqual({ nom: 'Élève exemplaire', type: 'badge', cible: 'total', seuil: 20, periode: 'semestre' });
  expect(r).toContainEqual({ nom: 'Avertissement', type: 'sanction', cible: 'discipline', seuil: -5, periode: 'mois' });
  expect(r).toContainEqual({ nom: 'Convocation des parents', type: 'sanction', cible: 'discipline', seuil: -10, periode: 'semestre' });
  expect(r).toContainEqual({ nom: "Signalement à l'administration", type: 'sanction', cible: 'retards', seuil: 3, periode: 'mois' });
});

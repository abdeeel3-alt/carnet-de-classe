import { typesDeDepart } from '../domaine/catalogue';
import { eleve, type } from '../domaine/fabriques-test';
import type { TypeObservation } from '../domaine/types';
import { interpreter } from './interpreteur';

const eleves = [
  eleve(1, 'Sara', 'ALAOUI'), eleve(4, 'Omar', 'CHRAIBI'), eleve(12, 'Salma', 'BENNANI'),
  eleve(17, 'Yassine', 'AMRANI'), eleve(23, 'Yassine', 'TAZI'), eleve(30, 'Mohamed Amine', 'EL FASSI'),
];
const [sara, omar, salma, yassineA, yassineT, amine] = eleves.map((e) => e.id);
const types: TypeObservation[] = [
  ...typesDeDepart().map((t, i) => ({ ...t, id: `t${i}`, updated_at: '', deleted: false })),
  type('Chewing-gum', 'discipline', -1),
];
const idDe = (libelle: string) => types.find((t) => t.libelle === libelle)!.id;
const absent = idDe('Absent'), retard = idDe('Retard'), sansUniforme = idDe('Sans uniforme');
const bonneParticipation = idDe('Bonne participation'), chewingGum = idDe('Chewing-gum');
const i = (texte: string) => interpreter(texte, eleves, types);

test('numéro en chiffres', () => {
  expect(i('numéro 12 absent')).toEqual({ sorte: 'action', eleveIds: [salma], typeId: absent });
});
test('numéro en lettres', () => {
  expect(i('numéro douze absent')).toEqual({ sorte: 'action', eleveIds: [salma], typeId: absent });
  expect(i('numéro vingt-trois absent')).toMatchObject({ sorte: 'action', eleveIds: [yassineT] });
  expect(i('numéro dix-sept en retard')).toMatchObject({ sorte: 'action', eleveIds: [yassineA], typeId: retard });
  expect(i('numéro un absent')).toMatchObject({ sorte: 'action', eleveIds: [sara] });
});
test('« un » article n’est pas un numéro', () => {
  expect(i('Salma a un retard')).toEqual({ sorte: 'action', eleveIds: [salma], typeId: retard });
});
test('prénom et synonyme d’observation', () => {
  expect(i('Salma participation plus')).toEqual({ sorte: 'action', eleveIds: [salma], typeId: bonneParticipation });
});
test('prénom mal transcrit, candidat unique', () => {
  expect(i('Selma participation plus')).toMatchObject({ sorte: 'action', eleveIds: [salma] });
});
test('observation avant les élèves, plusieurs élèves', () => {
  expect(i('sans uniforme Omar et Salma')).toEqual({ sorte: 'action', eleveIds: [omar, salma], typeId: sansUniforme });
});
test('liste de numéros', () => {
  expect(i('absents 4, 17 et 23')).toEqual({ sorte: 'action', eleveIds: [omar, yassineA, yassineT], typeId: absent });
  expect(i('absents : quatre, dix-sept et un')).toMatchObject({ sorte: 'action', eleveIds: [omar, yassineA, sara] });
});
test('prénom porté par deux élèves : choix, rien d’appliqué', () => {
  expect(i('Yassine en retard')).toEqual({
    sorte: 'choix', texte: 'Yassine en retard', eleveIds: [], types: [retard],
    eleves: [{ entendu: 'yassine', candidats: [yassineA, yassineT] }],
  });
});
test('prénom et nom lèvent l’ambiguïté, dans les deux ordres', () => {
  expect(i('Yassine Tazi en retard')).toMatchObject({ sorte: 'action', eleveIds: [yassineT] });
  expect(i('Amrani Yassine en retard')).toMatchObject({ sorte: 'action', eleveIds: [yassineA] });
});
test('noms composés', () => {
  expect(i('Mohamed Amine absent')).toMatchObject({ sorte: 'action', eleveIds: [amine] });
  expect(i('Amine absent')).toMatchObject({ sorte: 'action', eleveIds: [amine] });
  expect(i('El Fassi absent')).toMatchObject({ sorte: 'action', eleveIds: [amine] });
});
test('observation ajoutée par le professeur', () => {
  expect(i('Omar chewing-gum')).toEqual({ sorte: 'action', eleveIds: [omar], typeId: chewingGum });
});
test('élève cité deux fois : une seule fois dans le résultat', () => {
  expect(i('Omar et numéro 4 absent')).toMatchObject({ eleveIds: [omar] });
});
test('numéro inexistant : incompris', () => {
  expect(i('numéro 40 absent')).toEqual({ sorte: 'incompris', texte: 'numéro 40 absent' });
});
test('sans observation ou sans élève : incompris', () => {
  expect(i('bonjour tout le monde')).toMatchObject({ sorte: 'incompris' });
  expect(i('Omar')).toMatchObject({ sorte: 'incompris' });
  expect(i('absent')).toMatchObject({ sorte: 'incompris' });
  expect(i('')).toMatchObject({ sorte: 'incompris' });
});
test('observations masquées ou supprimées ignorées', () => {
  const masques = types.map((t) => (t.libelle === 'Bavardage' ? { ...t, masque: true } : t));
  expect(interpreter('Omar bavardage', eleves, masques)).toMatchObject({ sorte: 'incompris' });
});
test('élèves supprimés ignorés', () => {
  const sansOmar = eleves.map((e) => (e.id === omar ? { ...e, deleted: true } : e));
  expect(interpreter('numéro 4 absent', sansOmar, types)).toMatchObject({ sorte: 'incompris' });
});

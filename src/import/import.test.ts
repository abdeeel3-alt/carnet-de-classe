import { depuisTableau, detecterColonnes } from './tableau';
import { depuisTexte } from './texte';

test('tableau simple avec en-têtes en première ligne', () => {
  const simple = [['N°', 'Nom', 'Prénom'], ['1', 'ALAOUI', 'Sara'], ['2', 'AMRANI', 'Yassine']];
  expect(depuisTableau(simple, detecterColonnes(simple)!)).toEqual([
    { numero: 1, nom: 'ALAOUI', prenom: 'Sara' }, { numero: 2, nom: 'AMRANI', prenom: 'Yassine' },
  ]);
});
test('export Massar : bloc d’en-tête, lignes vides, colonnes décalées', () => {
  const massar = [
    ['Académie régionale', '', ''], ['', '', ''], ['Classe : 3AC-2', '', ''],
    ['', 'N° ordre', 'Code Massar', 'Nom', 'Prénom'],
    ['', '1', 'R130001', 'BENNANI', 'Salma'], ['', '2', 'R130002', 'CHRAIBI', 'Omar'], ['', '', '', '', ''],
  ];
  const c = detecterColonnes(massar)!;
  expect(c).toMatchObject({ ligneEntetes: 3, numero: 1, nom: 3, prenom: 4 });
  expect(depuisTableau(massar, c)).toEqual([
    { numero: 1, nom: 'BENNANI', prenom: 'Salma' }, { numero: 2, nom: 'CHRAIBI', prenom: 'Omar' },
  ]);
});
test('en-têtes en arabe', () => {
  const ar = [['رقم', 'النسب', 'الاسم'], ['1', 'ALAOUI', 'Sara']];
  expect(detecterColonnes(ar)).toMatchObject({ numero: 0, nom: 1, prenom: 2 });
});
test('sans colonne numéro : numérotation de 1 à n', () => {
  const l = [['Nom', 'Prénom'], ['ALAOUI', 'Sara'], ['', ''], ['AMRANI', 'Yassine']];
  expect(depuisTableau(l, detecterColonnes(l)!).map((e) => e.numero)).toEqual([1, 2]);
});
test('colonne « Nom et prénom » : le nom en majuscules, le reste en prénom', () => {
  const l = [['N°', 'Nom et prénom'], ['1', 'ALAOUI Sara'], ['2', 'EL AMRANI Mohamed Yassine'], ['3', 'Bennani Salma']];
  const c = detecterColonnes(l)!;
  expect(c.nomComplet).toBe(1);
  expect(depuisTableau(l, c)).toEqual([
    { numero: 1, nom: 'ALAOUI', prenom: 'Sara' },
    { numero: 2, nom: 'EL AMRANI', prenom: 'Mohamed Yassine' },
    { numero: 3, nom: 'Bennani', prenom: 'Salma' },
  ]);
});
test('numéro illisible : on continue la numérotation', () => {
  const l = [['N°', 'Nom', 'Prénom'], ['1', 'A', 'a'], ['x', 'B', 'b'], ['3.0', 'C', 'c']];
  expect(depuisTableau(l, detecterColonnes(l)!).map((e) => e.numero)).toEqual([1, 2, 3]);
});
test('aucun en-tête reconnu', () => {
  expect(detecterColonnes([['a', 'b'], ['c', 'd']])).toBeNull();
  expect(detecterColonnes([])).toBeNull();
});
test('texte libre ou lu sur photo', () => {
  expect(depuisTexte('1 ALAOUI Sara\n2. AMRANI Yassine\n\nBENNANI Salma')).toEqual([
    { numero: 1, nom: 'ALAOUI', prenom: 'Sara' }, { numero: 2, nom: 'AMRANI', prenom: 'Yassine' }, { numero: 3, nom: 'BENNANI', prenom: 'Salma' },
  ]);
});
test('texte : ignore les lignes sans lettres et accepte un mot seul', () => {
  expect(depuisTexte('---\n 12 | \nALAOUI\n')).toEqual([{ numero: 1, nom: 'ALAOUI', prenom: '' }]);
  expect(depuisTexte('')).toEqual([]);
});

import ExcelJS from 'exceljs';
import { eleve, local, obs } from '../domaine/fabriques-test';
import { calculerTotaux, totauxVides } from '../domaine/points';
import type { Attribution, Classe, Creneau, Seance } from '../domaine/types';
import { bilanComportement, emploiDuTemps, ficheEleve, listeDeClasse, registrePresence, sauvegardeComplete, type EnTeteDoc } from './classeurs';
import { COULEURS } from './styles';

const entete: EnTeteDoc = {
  etablissement: 'Collège Ibn Sina', professeur: 'M. Test', matiere: 'Mathématiques',
  classe: '3AC-2', annee: '2026-2027', periode: 'du 01/11/2026 au 30/11/2026', titre: '',
};
const eleves45 = Array.from({ length: 45 }, (_, i) => eleve(i + 1, `Prénom${i + 1}`, `NOM${i + 1}`));
const trois = [eleve(1, 'Sara', 'ALAOUI'), eleve(2, 'Yassine', 'AMRANI'), eleve(3, 'Salma', 'BENNANI')];
/** Numéro de la ligne des titres de colonnes : celle que l'impression répète. */
const L = (f: ExcelJS.Worksheet) => Number(String(f.pageSetup.printTitlesRow).split(':')[0]);
const texteLigne = (f: ExcelJS.Worksheet, n: number) => (f.getRow(n).values as unknown[]).filter(Boolean).map(String);
const ligneDe = (f: ExcelJS.Worksheet, texte: string) => {
  for (let n = 1; n <= f.rowCount; n++) if (texteLigne(f, n).includes(texte)) return f.getRow(n);
  throw new Error(`ligne « ${texte} » introuvable`);
};
const couleurFond = (c: ExcelJS.Cell) => (c.fill as ExcelJS.FillPattern | undefined)?.fgColor?.argb;

describe('bilan de comportement', () => {
  const totaux = calculerTotaux([obs('e1', 'participation', 3), obs('e2', 'discipline', -2), obs('e2', 'presence', 0, { code: 'retard' })]);
  const attributions = [{ id: 'a', updated_at: '', deleted: false, eleve_id: 'e1', regle_id: null, libelle: 'Participant actif', type: 'badge', date: '', etat: 'validee', cle_periode: '' } as Attribution];
  const f = bilanComportement(entete, eleves45, totaux, attributions).worksheets[0];

  test('mise en page A4 paysage, ajustée à une page de large, titres répétés', () => {
    expect(f.pageSetup).toMatchObject({ paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 });
    expect(f.pageSetup.printTitlesRow).toBe(`${L(f)}:${L(f)}`);
    expect(f.headerFooter.oddFooter).toContain('&P');
    expect(f.headerFooter.oddFooter).toContain('Édité le');
  });
  test('bandeau de titre et en-tête du document', () => {
    expect(f.getRow(1).getCell(1).value).toBe('Bilan de comportement');
    expect(couleurFond(f.getRow(1).getCell(1))).toBe(COULEURS.bandeau);
    const haut = [2, 3, 4].flatMap((n) => texteLigne(f, n)).join(' | ');
    for (const attendu of ['Collège Ibn Sina', 'M. Test', 'Mathématiques', '3AC-2', '2026-2027', 'du 01/11/2026 au 30/11/2026']) expect(haut).toContain(attendu);
  });
  test('titres de colonnes en gras, blancs sur fond de couleur', () => {
    const titres = f.getRow(L(f));
    expect(titres.getCell(1).font).toMatchObject({ bold: true, color: { argb: 'FFFFFFFF' } });
    expect(titres.getCell(1).fill).toMatchObject({ type: 'pattern', pattern: 'solid' });
    const noms = texteLigne(f, L(f));
    expect(noms).toEqual(expect.arrayContaining(['N°', 'Nom', 'Prénom', 'Participation', 'Discipline', 'Total', 'Absences', 'Retards', 'Badges', 'Sanctions']));
    const colonne = (nom: string) => noms.indexOf(nom) + 1;
    expect(couleurFond(titres.getCell(colonne('Discipline')))).toBe(COULEURS.discipline);
    expect(couleurFond(titres.getCell(colonne('Participation')))).toBe(COULEURS.participation);
  });
  test('une ligne par élève, bordée', () => {
    expect(f.rowCount).toBeGreaterThanOrEqual(L(f) + 45);
    expect(f.getRow(L(f) + 45).getCell(2).value).toBe('NOM45');
    expect(f.getRow(L(f) + 1).getCell(1).border?.top?.style).toBe('thin');
  });
  test('points : le signe est écrit et la couleur le double', () => {
    const noms = texteLigne(f, L(f));
    const cellule = (ligne: number, nom: string) => f.getRow(L(f) + ligne).getCell(noms.indexOf(nom) + 1);
    const positif = cellule(1, 'Participation');
    expect(positif.value).toBe(3);
    expect(positif.numFmt).toBe('+0;−0;0');
    expect(positif.font?.color?.argb).toBe(COULEURS.positif);
    const negatif = cellule(2, 'Discipline');
    expect(negatif.value).toBe(-2);
    expect(negatif.font?.color?.argb).toBe(COULEURS.negatif);
    expect(cellule(2, 'Retards').value).toBe(1);
    expect(cellule(1, 'Badges').value).toBe('Participant actif');
  });
  test('lignes alternées teintées', () => {
    expect(couleurFond(f.getRow(L(f) + 2).getCell(2))).toBe(COULEURS.alterne);
    expect(couleurFond(f.getRow(L(f) + 1).getCell(2))).toBeUndefined();
  });
  test('ligne de moyennes sur fond soutenu', () => {
    const moyenne = ligneDe(f, 'Moyenne de la classe');
    expect(couleurFond(moyenne.getCell(1))).toBe(COULEURS.total);
    expect(moyenne.getCell(1).font?.bold).toBe(true);
  });
  test('classe vide : le classeur est produit avec « Aucun élève »', () => {
    const vide = bilanComportement(entete, [], new Map(), []).worksheets[0];
    expect(texteLigne(vide, L(vide) + 1)).toContain('Aucun élève');
  });
  test('le fichier produit se relit', async () => {
    const octets = await bilanComportement(entete, trois, totaux, []).xlsx.writeBuffer();
    const relu = new ExcelJS.Workbook();
    await relu.xlsx.load(octets as ArrayBuffer);
    expect(relu.worksheets[0].getRow(1).getCell(1).value).toBe('Bilan de comportement');
    expect(relu.worksheets[0].pageSetup.orientation).toBe('landscape');
  });
});

test('liste de classe : portrait, 8 colonnes vides bordées après Prénom', () => {
  const f = listeDeClasse(entete, trois).worksheets[0];
  expect(f.pageSetup).toMatchObject({ paperSize: 9, orientation: 'portrait', fitToWidth: 1 });
  expect(f.getRow(1).getCell(1).value).toBe('Liste de classe');
  expect(f.columnCount).toBe(11);
  const premiere = f.getRow(L(f) + 1);
  expect([premiere.getCell(1).value, premiere.getCell(2).value, premiere.getCell(3).value]).toEqual([1, 'ALAOUI', 'Sara']);
  expect(premiere.getCell(11).border?.left?.style).toBe('thin');
});

test('registre de présence : A et R en lettres et en couleur, totaux en fin de ligne', () => {
  const seance = (id: string, jour: number): Seance => ({ id, updated_at: '', deleted: false, classe_id: 'c1', creneau_id: null, debut: local(2026, 11, jour, 8).toISOString(), terminee: true });
  const seances = [seance('s2', 12), seance('s1', 10)];
  const observations = [
    obs('e1', 'presence', 0, { code: 'absent', seance_id: 's1' }),
    obs('e1', 'presence', 0, { code: 'retard', seance_id: 's2' }),
    obs('e2', 'presence', 0, { code: 'absent', seance_id: 's2' }),
    obs('e3', 'discipline', -1, { seance_id: 's1' }),
  ];
  const f = registrePresence(entete, trois, seances, observations).worksheets[0];
  expect(f.pageSetup.orientation).toBe('landscape');
  expect(texteLigne(f, L(f))).toEqual(['N°', 'Nom et prénom', '10/11', '12/11', 'Total A', 'Total R']);
  const sara = f.getRow(L(f) + 1);
  expect(sara.getCell(3).value).toBe('A');
  expect(couleurFond(sara.getCell(3))).toBe(COULEURS.fondNegatif);
  expect(sara.getCell(4).value).toBe('R');
  expect(couleurFond(sara.getCell(4))).toBe(COULEURS.fondRetard);
  expect([sara.getCell(5).value, sara.getCell(6).value]).toEqual([1, 1]);
  const salma = f.getRow(L(f) + 3);
  expect([salma.getCell(3).value, salma.getCell(5).value]).toEqual([null, 0]);
});

test('fiche élève : totaux, observations datées et remarques', () => {
  const sara = eleve(1, 'Sara', 'ALAOUI', { remarques: 'À placer devant.' });
  const observations = [obs('e1', 'discipline', -1, { libelle: 'Bavardage' }), obs('e1', 'presence', 0, { code: 'absent', libelle: 'Absent' })];
  const f = ficheEleve(entete, {
    eleve: sara, classe: { nom: '3AC-2' } as Classe, intervalle: { debut: local(2026, 11, 1), fin: local(2026, 11, 30) },
    totaux: calculerTotaux(observations).get('e1') ?? totauxVides(), absences: [observations[1]], retards: [], observations, attributions: [],
  }).worksheets[0];
  expect(f.pageSetup.orientation).toBe('portrait');
  expect(f.getRow(1).getCell(1).value).toBe('Fiche élève — ALAOUI Sara (n° 1)');
  expect(ligneDe(f, 'Bavardage').getCell(4).value).toBe(-1);
  expect(texteLigne(f, ligneDe(f, 'Bavardage').number)).toContain('12/11/2026');
  expect(ligneDe(f, 'Absences').getCell(2).value).toBe(1);
  expect(ligneDe(f, 'À placer devant.')).toBeTruthy();
});

test('emploi du temps : une ligne par horaire, une colonne par jour', () => {
  const c = (jour: Creneau['jour'], debut: string, fin: string, classe_id: string, salle = ''): Creneau => ({ id: `${jour}${debut}`, updated_at: '', deleted: false, jour, debut, fin, classe_id, salle });
  const classes = [{ id: 'k1', nom: '3AC-2' }, { id: 'k2', nom: '2AC-1' }] as Classe[];
  const f = emploiDuTemps(entete, [c(2, '10:00', '12:00', 'k2'), c(1, '08:00', '09:00', 'k1', '7'), c(3, '08:00', '09:00', 'k2')], classes).worksheets[0];
  expect(f.pageSetup.orientation).toBe('landscape');
  expect(texteLigne(f, L(f))).toEqual(['Horaire', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']);
  expect(texteLigne(f, L(f) + 1)).toEqual(['08:00 – 09:00', '3AC-2\nSalle 7', '2AC-1']);
  expect(f.getRow(L(f) + 2).getCell(3).value).toBe('2AC-1');
});

test('sauvegarde complète : une feuille par table', () => {
  const tables = { classes: [{ id: 'k1', nom: '3AC-2' }], eleves: [], creneaux: [], seances: [], types_observation: [{ id: 't', synonymes: ['a', 'b'] }], observations: [], regles: [], attributions: [], parametres: [] };
  const classeur = sauvegardeComplete(tables);
  expect(classeur.worksheets.map((w) => w.name)).toEqual(['classes', 'eleves', 'creneaux', 'seances', 'types_observation', 'observations', 'regles', 'attributions', 'parametres']);
  expect(classeur.getWorksheet('classes')!.getRow(2).getCell(2).value).toBe('3AC-2');
  expect(classeur.getWorksheet('types_observation')!.getRow(2).getCell(2).value).toBe('["a","b"]');
});

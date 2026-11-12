import { beforeEach } from 'vitest';
import type { Classe, Eleve, Observation, Parametres, Seance } from '../domaine/types';
import { enregistrer, initialiser, lireParametres, viderBase } from '../stockage/depot';
import { preparerExport } from './donnees';

const aujourdHui = new Date(2026, 10, 12, 10);
const le = (mois: number, jour: number) => new Date(2026, mois - 1, jour, 9).toISOString();
let classeId = '';
let sara = '';
beforeEach(async () => {
  await viderBase();
  await initialiser();
  await enregistrer<Parametres>('parametres', { ...(await lireParametres()), etablissement: 'Collège Ibn Sina', professeur: 'M. Test' });
  classeId = (await enregistrer<Classe>('classes', { nom: '3AC-2', niveau: '3AC', annee: '2026-2027', archivee: false, plan_rangees: 5, plan_colonnes: 6 })).id;
  const e = async (numero: number, nom: string, prenom: string) =>
    (await enregistrer<Eleve>('eleves', { classe_id: classeId, numero, nom, prenom, rangee: null, colonne: null, remarques: '' })).id;
  sara = await e(1, 'ALAOUI', 'Sara');
  await e(2, 'AMRANI', 'Yassine');
  const seance = async (mois: number, jour: number) =>
    (await enregistrer<Seance>('seances', { classe_id: classeId, creneau_id: null, debut: le(mois, jour), terminee: true })).id;
  const novembre = await seance(11, 10);
  const octobre = await seance(10, 20);
  const o = (seance_id: string, horodatage: string, points: number, code: Observation['code'] = null) => enregistrer<Observation>('observations', {
    seance_id, eleve_id: sara, type_id: 't', critere: code ? 'presence' : 'participation', code, libelle: 'x', points, horodatage,
  });
  await o(novembre, le(11, 10), 2);
  await o(novembre, le(11, 10), 0, 'absent');
  await o(octobre, le(10, 20), 5);
});
const lignes = (f: import('exceljs').Worksheet) => {
  const sortie: unknown[][] = [];
  f.eachRow((r) => sortie.push((r.values as unknown[]).slice(1)));
  return sortie;
};

test('bilan du mois : seules les observations de la période comptent', async () => {
  const { classeur, nomFichier } = await preparerExport('bilan', { classeId, choix: { type: 'mois' } }, aujourdHui);
  const f = classeur.worksheets[0];
  const haut = lignes(f).slice(0, 4).flat().join(' ');
  expect(haut).toContain('Collège Ibn Sina');
  expect(haut).toContain('3AC-2');
  expect(haut).toContain('du 01/11/2026 au 30/11/2026');
  const ligneSara = lignes(f).find((l) => l[1] === 'ALAOUI')!;
  expect(ligneSara.slice(3, 11)).toEqual([0, 0, 2, 0, 0, 2, 1, 0]);
  expect(nomFichier).toBe('bilan_3AC-2_2026-11-01_2026-11-30.xlsx');
});
test('registre du mois : seules les séances de la période ont une colonne', async () => {
  const { classeur } = await preparerExport('presence', { classeId, choix: { type: 'mois' } }, aujourdHui);
  expect(lignes(classeur.worksheets[0])[4]).toEqual(['N°', 'Nom et prénom', '10/11', 'Total A', 'Total R']);
});
test('fiche élève sur des dates au choix', async () => {
  const { classeur, nomFichier } = await preparerExport('fiche', { classeId, eleveId: sara, choix: { type: 'dates', debut: '2026-10-01', fin: '2026-10-31' } }, aujourdHui);
  expect(classeur.worksheets[0].getCell(1, 1).value).toBe('Fiche élève — ALAOUI Sara (n° 1)');
  expect(lignes(classeur.worksheets[0]).find((l) => l[0] === 'Participation')![1]).toBe(5);
  expect(nomFichier).toBe('fiche_ALAOUI-Sara_2026-10-01_2026-10-31.xlsx');
});
test('liste, emploi du temps et sauvegarde', async () => {
  expect((await preparerExport('liste', { classeId, choix: { type: 'mois' } }, aujourdHui)).nomFichier).toBe('liste_3AC-2.xlsx');
  expect((await preparerExport('emploi', { choix: { type: 'mois' } }, aujourdHui)).nomFichier).toBe('emploi-du-temps.xlsx');
  const sauvegarde = await preparerExport('sauvegarde', { choix: { type: 'mois' } }, aujourdHui);
  expect(sauvegarde.nomFichier).toBe('sauvegarde_2026-11-12.xlsx');
  expect(sauvegarde.classeur.getWorksheet('eleves')!.rowCount).toBe(3);
});
test('export qui demande une classe ou un élève absent : erreur claire', async () => {
  await expect(preparerExport('bilan', { choix: { type: 'mois' } }, aujourdHui)).rejects.toThrow('Choisissez une classe');
  await expect(preparerExport('fiche', { classeId, choix: { type: 'mois' } }, aujourdHui)).rejects.toThrow('Choisissez un élève');
});

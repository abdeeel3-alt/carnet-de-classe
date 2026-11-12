import { beforeEach } from 'vitest';
import type { Attribution, Classe, Eleve, Observation } from '../../domaine/types';
import { enregistrer, initialiser, viderBase } from '../../stockage/depot';
import { donneesFiche } from './donneesFiche';

const local = (m: number, j: number, h = 9) => new Date(2026, m - 1, j, h).toISOString();
const aujourdHui = new Date(2026, 10, 12, 10);
let eleveId = '';
const obs = (points: number, horodatage: string, extra: Partial<Observation> = {}) => enregistrer<Observation>('observations', {
  seance_id: 's', eleve_id: eleveId, type_id: 't', critere: 'participation', code: null, libelle: 'Bonne participation', points, horodatage, ...extra,
});
const attribution = (etat: Attribution['etat'], date: string, libelle: string) => enregistrer<Attribution>('attributions', {
  eleve_id: eleveId, regle_id: null, libelle, type: 'badge', date, etat, cle_periode: '',
});

beforeEach(async () => {
  await viderBase();
  await initialiser();
  const c = await enregistrer<Classe>('classes', { nom: '3AC-2', niveau: '3AC', annee: '2026-2027', archivee: false, plan_rangees: 5, plan_colonnes: 6 });
  eleveId = (await enregistrer<Eleve>('eleves', { classe_id: c.id, numero: 1, nom: 'ALAOUI', prenom: 'Sara', rangee: null, colonne: null, remarques: '' })).id;
  await obs(1, local(10, 20));
  await obs(2, local(11, 3));
  await obs(1, local(11, 10));
  await obs(0, local(11, 5), { critere: 'presence', code: 'absent', libelle: 'Absent' });
  await obs(0, local(10, 6), { critere: 'presence', code: 'retard', libelle: 'Retard' });
  await obs(5, local(11, 11), { eleve_id: 'autre' });
});

test('mois en cours : seulement les observations de novembre', async () => {
  const d = (await donneesFiche(eleveId, { type: 'mois' }, aujourdHui))!;
  expect(d.eleve.nom).toBe('ALAOUI');
  expect(d.classe.nom).toBe('3AC-2');
  expect(d.observations.map((o) => o.horodatage)).toEqual([local(11, 10), local(11, 5), local(11, 3)]);
  expect(d.totaux.parCritere.participation).toBe(3);
  expect(d.totaux.total).toBe(3);
  expect(d.absences).toHaveLength(1);
  expect(d.retards).toHaveLength(0);
});
test('dates au choix : seulement octobre', async () => {
  const d = (await donneesFiche(eleveId, { type: 'dates', debut: '2026-10-01', fin: '2026-10-31' }, aujourdHui))!;
  expect(d.totaux.total).toBe(1);
  expect(d.retards).toHaveLength(1);
  expect(d.absences).toHaveLength(0);
});
test('période sans rien : totaux à zéro', async () => {
  const d = (await donneesFiche(eleveId, { type: 'dates', debut: '2026-09-01', fin: '2026-09-30' }, aujourdHui))!;
  expect(d.observations).toEqual([]);
  expect(d.totaux.total).toBe(0);
});
test('seules les attributions validées de la période sont listées', async () => {
  await attribution('validee', local(11, 4), 'Participant actif');
  await attribution('refusee', local(11, 4), 'Refusé');
  await attribution('validee', local(10, 4), 'Octobre');
  const d = (await donneesFiche(eleveId, { type: 'mois' }, aujourdHui))!;
  expect(d.attributions.map((a) => a.libelle)).toEqual(['Participant actif']);
});
test('élève inconnu', async () => {
  expect(await donneesFiche('inconnu', { type: 'mois' }, aujourdHui)).toBeNull();
});

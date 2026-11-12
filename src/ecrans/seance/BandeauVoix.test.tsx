import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, vi } from 'vitest';
import type { Classe, Eleve, Observation, Seance as S, TypeObservation } from '../../domaine/types';
import { enregistrer, initialiser, lister, viderBase } from '../../stockage/depot';
import * as ecoute from '../../voix/ecoute';
import Seance from './Seance';

vi.mock('../../voix/ecoute');
/** Simule une phrase reconnue : le rappel donné à `ecouter` reçoit les alternatives. */
let dire: (...alternatives: string[]) => void = () => {};

let seanceId = '';
beforeEach(async () => {
  await viderBase();
  await initialiser();
  vi.mocked(ecoute.voixDisponible).mockReturnValue(true);
  vi.mocked(ecoute.ecouter).mockImplementation((surTextes) => { dire = (...a) => act(() => surTextes(a)); return () => {}; });
  const c = await enregistrer<Classe>('classes', { nom: '3AC-2', niveau: '3AC', annee: '2026-2027', archivee: false, plan_rangees: 5, plan_colonnes: 6 });
  for (const [numero, nom, prenom] of [[12, 'BENNANI', 'Salma'], [17, 'AMRANI', 'Yassine'], [23, 'TAZI', 'Yassine']] as const) {
    await enregistrer<Eleve>('eleves', { classe_id: c.id, numero, nom, prenom, rangee: null, colonne: null, remarques: '' });
  }
  seanceId = (await enregistrer<S>('seances', { classe_id: c.id, creneau_id: null, debut: new Date().toISOString(), terminee: false })).id;
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function afficher() {
  render(<MemoryRouter initialEntries={[`/seance/${seanceId}`]}><Routes><Route path="/seance/:id" element={<Seance />} /></Routes></MemoryRouter>);
}
const observations = () => lister<Observation>('observations', { seance_id: seanceId });
async function parler(...alternatives: string[]) {
  await screen.findByRole('button', { name: /BENNANI/ });
  await userEvent.click(await screen.findByRole('button', { name: 'Parler' }));
  dire(...alternatives);
}

test('phrase comprise : appliquée, annoncée, annulable', async () => {
  afficher();
  await parler('numéro 12 absent');
  const bandeau = await screen.findByRole('status', { name: 'Commande vocale' });
  expect(bandeau).toHaveTextContent('BENNANI Salma : Absent');
  await waitFor(async () => expect((await observations()).map((o) => o.code)).toEqual(['absent']));
  await userEvent.click(within(bandeau).getByRole('button', { name: 'Annuler' }));
  await waitFor(async () => expect(await observations()).toEqual([]));
});

test('prénom ambigu : rien n’est enregistré avant le choix', async () => {
  afficher();
  await parler('Yassine en retard');
  const bandeau = await screen.findByRole('status', { name: 'Commande vocale' });
  expect(within(bandeau).getByRole('button', { name: '17 · AMRANI Yassine' })).toBeInTheDocument();
  expect(await observations()).toEqual([]);
  await userEvent.click(within(bandeau).getByRole('button', { name: '23 · TAZI Yassine' }));
  await waitFor(async () => expect(await observations()).toEqual([expect.objectContaining({ code: 'retard' })]));
  expect(await screen.findByRole('status', { name: 'Commande vocale' })).toHaveTextContent('TAZI Yassine : Retard');
});

test('phrase incomprise : affichée, rien d’enregistré', async () => {
  afficher();
  await parler('bonjour tout le monde');
  expect(await screen.findByRole('status', { name: 'Commande vocale' })).toHaveTextContent('Non compris : bonjour tout le monde');
  expect(await observations()).toEqual([]);
});

test('parmi les alternatives, on retient la première comprise', async () => {
  afficher();
  await parler('numéro douce absent', 'numéro 12 absent');
  expect(await screen.findByRole('status', { name: 'Commande vocale' })).toHaveTextContent('BENNANI Salma : Absent');
});

test('dire deux fois « absent » ne retire pas l’absence', async () => {
  afficher();
  await parler('numéro 12 absent');
  await waitFor(async () => expect(await observations()).toHaveLength(1));
  dire('numéro 12 absent');
  await new Promise((r) => setTimeout(r, 50));
  expect((await observations()).map((o) => o.code)).toEqual(['absent']);
});

test('sans reconnaissance vocale : pas de bouton micro', async () => {
  vi.mocked(ecoute.voixDisponible).mockReturnValue(false);
  afficher();
  await screen.findByRole('button', { name: /BENNANI/ });
  expect(screen.queryByRole('button', { name: 'Parler' })).not.toBeInTheDocument();
});

test('hors ligne : micro désactivé avec son explication', async () => {
  vi.stubGlobal('navigator', { ...navigator, onLine: false });
  afficher();
  expect(await screen.findByRole('button', { name: 'Voix indisponible hors ligne' })).toBeDisabled();
});

test('une observation ajoutée après le début de l’écoute est comprise', async () => {
  afficher();
  await parler('silence');
  await userEvent.click(await screen.findByRole('button', { name: 'Fermer' }));
  await enregistrer<TypeObservation>('types_observation', { critere: 'discipline', libelle: 'Chewing-gum', points: -1, ordre: 99, masque: false, synonymes: [], code: null });
  await screen.findByRole('button', { name: /BENNANI/ });
  await new Promise((r) => setTimeout(r, 50));
  dire('Salma chewing-gum');
  expect(await screen.findByRole('status', { name: 'Commande vocale' })).toHaveTextContent('BENNANI Salma : Chewing-gum');
});

test('la première transcription comprise l’emporte, même si elle demande une précision', async () => {
  afficher();
  await parler('Yassine bavardage', 'Salma bavardage');
  const bandeau = await screen.findByRole('status', { name: 'Commande vocale' });
  expect(within(bandeau).getByRole('button', { name: '17 · AMRANI Yassine' })).toBeInTheDocument();
  expect(await observations()).toEqual([]);
});

test('un prénom approchant demande confirmation avant d’enregistrer', async () => {
  afficher();
  await parler('Selma bavardage');
  const bandeau = await screen.findByRole('status', { name: 'Commande vocale' });
  expect(await observations()).toEqual([]);
  await userEvent.click(within(bandeau).getByRole('button', { name: '12 · BENNANI Salma' }));
  await waitFor(async () => expect(await observations()).toHaveLength(1));
});

test('les mots ignorés sont annoncés', async () => {
  afficher();
  await parler('Salma et Jasmin bavardage');
  expect(await screen.findByRole('status', { name: 'Commande vocale' })).toHaveTextContent('BENNANI Salma : Bavardage · ignoré : jasmin');
});

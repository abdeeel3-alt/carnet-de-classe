import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, vi } from 'vitest';
import type { Attribution, Classe, Eleve, Observation } from '../../domaine/types';
import { enregistrer, initialiser, lister, obtenir, viderBase } from '../../stockage/depot';
import FicheEleve from './FicheEleve';

let eleveId = '';
beforeEach(async () => {
  await viderBase();
  await initialiser();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 12, 10));
  const c = await enregistrer<Classe>('classes', { nom: '3AC-2', niveau: '3AC', annee: '2026-2027', archivee: false, plan_rangees: 5, plan_colonnes: 6 });
  eleveId = (await enregistrer<Eleve>('eleves', { classe_id: c.id, numero: 3, nom: 'BENNANI', prenom: 'Salma', rangee: null, colonne: null, remarques: '' })).id;
  const o = (libelle: string, points: number, mois: number, jour: number) => enregistrer<Observation>('observations', {
    seance_id: 's', eleve_id: eleveId, type_id: 't', critere: 'discipline', code: null, libelle, points, horodatage: new Date(2026, mois - 1, jour, 9).toISOString(),
  });
  await o('Bavardage', -1, 11, 10);
  await o('Perturbe le cours', -2, 10, 14);
});
afterEach(() => vi.useRealTimers());
const afficher = () => render(
  <MemoryRouter initialEntries={[`/eleve/${eleveId}`]}><Routes><Route path="/eleve/:id" element={<FicheEleve />} /></Routes></MemoryRouter>,
);

test('par défaut le semestre en cours ; la période choisie filtre toute la fiche', async () => {
  const u = userEvent.setup();
  afficher();
  expect(await screen.findByRole('button', { name: 'Semestre 1' })).toHaveAttribute('aria-pressed', 'true');
  expect(await screen.findByLabelText('Discipline : −3')).toBeInTheDocument();
  await u.click(screen.getByRole('button', { name: 'Mois' }));
  expect(await screen.findByLabelText('Discipline : −1')).toBeInTheDocument();
  expect(screen.getByText('Bavardage')).toBeInTheDocument();
  expect(screen.queryByText('Perturbe le cours')).not.toBeInTheDocument();
});
test('dates au choix', async () => {
  const u = userEvent.setup();
  afficher();
  await u.click(await screen.findByRole('button', { name: 'Dates' }));
  await u.clear(screen.getByLabelText('Du'));
  await u.type(screen.getByLabelText('Du'), '2026-10-01');
  await u.clear(screen.getByLabelText('Au'));
  await u.type(screen.getByLabelText('Au'), '2026-10-31');
  expect(await screen.findByLabelText('Discipline : −2')).toBeInTheDocument();
  await u.clear(screen.getByLabelText('Du'));
  await u.type(screen.getByLabelText('Du'), '2026-09-01');
  await u.clear(screen.getByLabelText('Au'));
  await u.type(screen.getByLabelText('Au'), '2026-09-30');
  expect(await screen.findByText('Aucune observation sur cette période.')).toBeInTheDocument();
});
test('attribuer un badge à la main', async () => {
  const u = userEvent.setup();
  afficher();
  await u.click(await screen.findByRole('button', { name: 'Attribuer un badge ou une sanction' }));
  await u.type(screen.getByLabelText('Intitulé'), 'Progrès remarquable');
  await u.click(screen.getByRole('button', { name: 'Attribuer' }));
  await waitFor(async () => expect(await lister<Attribution>('attributions', { eleve_id: eleveId })).toEqual([
    expect.objectContaining({ libelle: 'Progrès remarquable', type: 'badge', etat: 'validee', regle_id: null }),
  ]));
  expect(await screen.findByText('Progrès remarquable')).toBeInTheDocument();
});
test('les remarques sont enregistrées', async () => {
  const u = userEvent.setup();
  afficher();
  await u.type(await screen.findByLabelText('Remarques'), 'A besoin d’être devant.');
  await u.tab();
  await waitFor(async () => expect((await obtenir<Eleve>('eleves', eleveId))!.remarques).toBe('A besoin d’être devant.'));
});

test('supprimer une observation depuis la fiche', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  const u = userEvent.setup();
  afficher();
  expect(await screen.findByLabelText('Discipline : −3')).toBeInTheDocument();
  await u.click(screen.getByRole('button', { name: 'Supprimer l’observation Perturbe le cours' }));
  expect(await screen.findByLabelText('Discipline : −1')).toBeInTheDocument();
  expect((await lister<Observation>('observations', { eleve_id: eleveId })).map((o) => o.libelle)).toEqual(['Bavardage']);
});

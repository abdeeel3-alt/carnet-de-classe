import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach } from 'vitest';
import type { TypeObservation } from '../../domaine/types';
import { initialiser, lister, viderBase } from '../../stockage/depot';
import Catalogue from './Catalogue';

beforeEach(async () => { await viderBase(); await initialiser(); });
const afficher = () => render(<MemoryRouter><Catalogue /></MemoryRouter>);
const type = async (libelle: string) => (await lister<TypeObservation>('types_observation')).find((t) => t.libelle === libelle);

test('modifier le libellé et les points d’une observation', async () => {
  const u = userEvent.setup();
  afficher();
  await u.click(await screen.findByRole('button', { name: /Bavardage/ }));
  await u.clear(screen.getByLabelText('Observation'));
  await u.type(screen.getByLabelText('Observation'), 'Bavardage répété');
  await u.clear(screen.getByLabelText('Points'));
  await u.type(screen.getByLabelText('Points'), '-2');
  await u.click(screen.getByRole('button', { name: 'Enregistrer' }));
  await waitFor(async () => expect(await type('Bavardage répété')).toMatchObject({ points: -2, critere: 'discipline' }));
});
test('masquer puis réafficher', async () => {
  const u = userEvent.setup();
  afficher();
  await u.click(await screen.findByRole('button', { name: /Ne suit pas/ }));
  await u.click(screen.getByRole('button', { name: 'Masquer' }));
  await waitFor(async () => expect((await type('Ne suit pas'))!.masque).toBe(true));
  await u.click(await screen.findByRole('button', { name: /Ne suit pas.*masquée/ }));
  await u.click(screen.getByRole('button', { name: 'Réafficher' }));
  await waitFor(async () => expect((await type('Ne suit pas'))!.masque).toBe(false));
});
test('Absent et Retard ne peuvent être ni masqués ni supprimés', async () => {
  const u = userEvent.setup();
  afficher();
  await u.click(await screen.findByRole('button', { name: /^Absent/ }));
  expect(screen.queryByRole('button', { name: 'Masquer' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Supprimer' })).not.toBeInTheDocument();
});
test('descendre une observation dans son groupe', async () => {
  const u = userEvent.setup();
  afficher();
  await u.click(await screen.findByRole('button', { name: /Bavardage/ }));
  await u.click(screen.getByRole('button', { name: 'Descendre' }));
  await waitFor(() => {
    const noms = within(screen.getByRole('group', { name: 'Discipline' })).getAllByRole('button').map((b) => b.textContent);
    expect(noms.slice(0, 2).join('|')).toMatch(/Perturbe le cours.*\|Bavardage/);
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import type { Classe, Eleve } from '../domaine/types';
import { telecharger } from '../export/telecharger';
import { enregistrer, initialiser, viderBase } from '../stockage/depot';
import Exports from './Exports';

vi.mock('../export/telecharger', () => ({ telecharger: vi.fn(async () => {}) }));

beforeEach(async () => {
  vi.mocked(telecharger).mockClear();
  await viderBase();
  await initialiser();
  const c = await enregistrer<Classe>('classes', { nom: '3AC-2', niveau: '3AC', annee: '2026-2027', archivee: false, plan_rangees: 5, plan_colonnes: 6 });
  await enregistrer<Eleve>('eleves', { classe_id: c.id, numero: 1, nom: 'ALAOUI', prenom: 'Sara', rangee: null, colonne: null, remarques: '' });
});
const afficher = () => render(<MemoryRouter><Exports /></MemoryRouter>);

test('télécharge le bilan de la classe choisie', async () => {
  const u = userEvent.setup();
  afficher();
  await u.click(await screen.findByRole('button', { name: /Bilan de comportement/ }));
  await u.click(screen.getByRole('button', { name: 'Mois' }));
  await u.click(screen.getByRole('button', { name: 'Télécharger le fichier Excel' }));
  await waitFor(() => expect(telecharger).toHaveBeenCalledTimes(1));
  const [classeur, nom] = vi.mocked(telecharger).mock.calls[0];
  expect(nom).toMatch(/^bilan_3AC-2_\d{4}-\d{2}-01_.*\.xlsx$/);
  expect(classeur.worksheets[0].getCell(1, 1).value).toBe('Bilan de comportement');
});
test('la fiche élève demande de choisir l’élève', async () => {
  const u = userEvent.setup();
  afficher();
  await u.click(await screen.findByRole('button', { name: /Fiche élève/ }));
  await u.click(screen.getByRole('button', { name: 'Télécharger le fichier Excel' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Choisissez un élève');
  await u.selectOptions(screen.getByLabelText('Élève'), screen.getByRole('option', { name: '1 · ALAOUI Sara' }));
  await u.click(screen.getByRole('button', { name: 'Télécharger le fichier Excel' }));
  await waitFor(() => expect(telecharger).toHaveBeenCalledTimes(1));
  expect(vi.mocked(telecharger).mock.calls[0][1]).toMatch(/^fiche_ALAOUI-Sara_/);
});
test('la sauvegarde complète ne demande ni classe ni période', async () => {
  const u = userEvent.setup();
  afficher();
  await u.click(await screen.findByRole('button', { name: /Sauvegarde complète/ }));
  expect(screen.queryByLabelText('Classe')).not.toBeInTheDocument();
  expect(screen.queryByRole('group', { name: 'Période' })).not.toBeInTheDocument();
  await u.click(screen.getByRole('button', { name: 'Télécharger le fichier Excel' }));
  await waitFor(() => expect(vi.mocked(telecharger).mock.calls[0]?.[1]).toMatch(/^sauvegarde_/));
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach } from 'vitest';
import type { Regle } from '../../domaine/types';
import { initialiser, lister, viderBase } from '../../stockage/depot';
import Regles from './Regles';

beforeEach(async () => { await viderBase(); await initialiser(); });
const afficher = () => render(<MemoryRouter><Regles /></MemoryRouter>);

test('liste les règles de départ avec leur seuil en clair', async () => {
  afficher();
  expect(await screen.findByRole('button', { name: /Avertissement.*−5 en Discipline sur le mois/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Signalement.*3 retards sur le mois/ })).toBeInTheDocument();
});
test('créer une sanction : le seuil saisi devient négatif', async () => {
  const u = userEvent.setup();
  afficher();
  await u.click(await screen.findByRole('button', { name: '+ Nouvelle règle' }));
  await u.type(screen.getByLabelText('Nom'), 'Retenue');
  await u.click(screen.getByRole('button', { name: 'Sanction' }));
  await u.selectOptions(screen.getByLabelText('Porte sur'), 'serieux');
  await u.clear(screen.getByLabelText('Seuil'));
  await u.type(screen.getByLabelText('Seuil'), '4');
  await u.selectOptions(screen.getByLabelText('Période'), 'semaine');
  await u.click(screen.getByRole('button', { name: 'Enregistrer' }));
  await waitFor(async () => expect((await lister<Regle>('regles')).find((r) => r.nom === 'Retenue')).toMatchObject({ type: 'sanction', cible: 'serieux', seuil: -4, periode: 'semaine' }));
});
test('modifier le seuil d’une règle existante, puis la supprimer', async () => {
  const u = userEvent.setup();
  afficher();
  await u.click(await screen.findByRole('button', { name: /Participant actif/ }));
  await u.clear(screen.getByLabelText('Seuil'));
  await u.type(screen.getByLabelText('Seuil'), '8');
  await u.click(screen.getByRole('button', { name: 'Enregistrer' }));
  await waitFor(async () => expect((await lister<Regle>('regles')).find((r) => r.nom === 'Participant actif')!.seuil).toBe(8));
  await u.click(await screen.findByRole('button', { name: /Participant actif/ }));
  await u.click(screen.getByRole('button', { name: 'Supprimer la règle' }));
  await waitFor(async () => expect(await lister<Regle>('regles')).toHaveLength(4));
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach } from 'vitest';
import type { Classe, Creneau } from '../domaine/types';
import { enregistrer, lister, viderBase } from '../stockage/depot';
import EmploiDuTemps from './EmploiDuTemps';

let classeId = '';
beforeEach(async () => {
  await viderBase();
  classeId = (await enregistrer<Classe>('classes', { nom: '3AC-2', niveau: '3AC', annee: '2026-2027', archivee: false, plan_rangees: 5, plan_colonnes: 6 })).id;
});
const afficher = () => render(<MemoryRouter><EmploiDuTemps /></MemoryRouter>);

test('ajoute un créneau le jour choisi', async () => {
  const u = userEvent.setup();
  afficher();
  await u.click(await screen.findByRole('tab', { name: 'Mar' }));
  await u.click(screen.getByRole('button', { name: '+ Créneau' }));
  await u.selectOptions(screen.getByLabelText('Début'), '10:00');
  await u.selectOptions(screen.getByLabelText('Fin'), '12:00');
  await u.type(screen.getByLabelText('Salle'), '12');
  await u.click(screen.getByRole('button', { name: 'Enregistrer' }));
  expect(await screen.findByText(/10:00 – 12:00/)).toBeInTheDocument();
  expect(await lister<Creneau>('creneaux')).toEqual([expect.objectContaining({ jour: 2, debut: '10:00', fin: '12:00', classe_id: classeId, salle: '12' })]);
});

test('refuse une fin avant le début et un chevauchement', async () => {
  await enregistrer<Creneau>('creneaux', { jour: 1, debut: '08:00', fin: '10:00', classe_id: classeId, salle: '' });
  const u = userEvent.setup();
  afficher();
  await u.click(await screen.findByRole('tab', { name: 'Lun' }));
  await u.click(screen.getByRole('button', { name: '+ Créneau' }));
  await u.selectOptions(screen.getByLabelText('Début'), '11:00');
  await u.selectOptions(screen.getByLabelText('Fin'), '10:00');
  await u.click(screen.getByRole('button', { name: 'Enregistrer' }));
  expect(screen.getByRole('alert')).toHaveTextContent('La fin doit être après le début');
  await u.selectOptions(screen.getByLabelText('Début'), '09:00');
  await u.selectOptions(screen.getByLabelText('Fin'), '11:00');
  await u.click(screen.getByRole('button', { name: 'Enregistrer' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Ce créneau chevauche un autre créneau');
  expect(await lister('creneaux')).toHaveLength(1);
});

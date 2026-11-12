import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { afterEach, beforeEach, vi } from 'vitest';
import type { Classe, Creneau, Seance } from '../domaine/types';
import { enregistrer, lister, modifier, viderBase } from '../stockage/depot';
import Accueil from './Accueil';

const classe = (nom: string) => enregistrer<Classe>('classes', { nom, niveau: '3AC', annee: '2026-2027', archivee: false, plan_rangees: 5, plan_colonnes: 6 });
function EcranSeance() { return <p>Séance {useParams().id}</p>; }
function afficher() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/seance/:id" element={<EcranSeance />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await viderBase();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 9, 8, 30)); // lundi 9 novembre 2026, 08:30
});
afterEach(() => vi.useRealTimers());

test('affiche la séance en cours et la démarre en un geste', async () => {
  const c = await classe('3AC-2');
  const cr = await enregistrer<Creneau>('creneaux', { jour: 1, debut: '08:00', fin: '09:00', classe_id: c.id, salle: '7' });
  afficher();
  const vedette = await screen.findByRole('region', { name: 'En cours' });
  expect(within(vedette).getByText('3AC-2')).toBeInTheDocument();
  expect(within(vedette).getByText(/08:00 – 09:00/)).toBeInTheDocument();
  expect(within(vedette).getByText(/Salle 7/)).toBeInTheDocument();
  await userEvent.click(within(vedette).getByRole('button', { name: 'Démarrer' }));
  const [seance] = await lister<Seance>('seances');
  expect(seance).toMatchObject({ classe_id: c.id, creneau_id: cr.id, terminee: false });
  expect(await screen.findByText(`Séance ${seance.id}`)).toBeInTheDocument();
});

test('entre deux cours : annonce la prochaine séance', async () => {
  const c = await classe('2AC-1');
  await enregistrer<Creneau>('creneaux', { jour: 1, debut: '10:00', fin: '11:00', classe_id: c.id, salle: '' });
  afficher();
  const vedette = await screen.findByRole('region', { name: 'Prochaine séance' });
  expect(within(vedette).getByText('2AC-1')).toBeInTheDocument();
});

test('sans créneau : toucher une classe ouvre une séance libre', async () => {
  const c = await classe('3AC-2');
  const archivee = await classe('Ancienne');
  await modifier<Classe>('classes', archivee.id, { archivee: true });
  afficher();
  await userEvent.click(await screen.findByRole('button', { name: /3AC-2/ }));
  const [seance] = await lister<Seance>('seances');
  expect(seance).toMatchObject({ classe_id: c.id, creneau_id: null });
  expect(screen.queryByText('Ancienne')).not.toBeInTheDocument();
});

test('sans aucune classe : invite à créer la première', async () => {
  afficher();
  expect(await screen.findByText(/Créez votre première classe/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Créer une classe' })).toHaveAttribute('href', '/reglages/classes');
});

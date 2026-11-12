import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach } from 'vitest';
import type { Classe, Eleve, Seance as S } from '../../domaine/types';
import { enregistrer, initialiser, lireMeta, viderBase } from '../../stockage/depot';
import Seance from './Seance';

let seanceId = '';
let classeId = '';
beforeEach(async () => {
  await viderBase();
  await initialiser();
  classeId = (await enregistrer<Classe>('classes', { nom: '3AC-2', niveau: '3AC', annee: '2026-2027', archivee: false, plan_rangees: 4, plan_colonnes: 6 })).id;
  const e = (numero: number, nom: string, prenom: string, rangee: number | null, colonne: number | null) =>
    enregistrer<Eleve>('eleves', { classe_id: classeId, numero, nom, prenom, rangee, colonne, remarques: '' });
  await e(1, 'ALAOUI', 'Sara', 0, 0);
  await e(2, 'AMRANI', 'Yassine', 1, 2);
  await e(3, 'BENNANI', 'Salma', null, null);
  seanceId = (await enregistrer<S>('seances', { classe_id: classeId, creneau_id: null, debut: new Date().toISOString(), terminee: false })).id;
});
function afficher() {
  return render(
    <MemoryRouter initialEntries={[`/seance/${seanceId}`]}>
      <Routes><Route path="/seance/:id" element={<Seance />} /></Routes>
    </MemoryRouter>,
  );
}

test('la vue Plan montre toutes les cases et les élèves à leur place', async () => {
  const u = userEvent.setup();
  const { container } = afficher();
  await u.click(await screen.findByRole('button', { name: 'Plan' }));
  const plan = await screen.findByRole('group', { name: 'Plan de classe' });
  expect(container.querySelectorAll('[data-case]')).toHaveLength(24);
  expect(within(plan).getAllByRole('button')).toHaveLength(2);
  expect(within(plan).getByRole('button', { name: /1.*Sara A\./ })).toBeInTheDocument();
});
test('toucher une case occupée ouvre le panneau d’observations', async () => {
  const u = userEvent.setup();
  afficher();
  await u.click(await screen.findByRole('button', { name: 'Plan' }));
  await u.click(await screen.findByRole('button', { name: /2.*Yassine A\./ }));
  await u.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Bavardage/ }));
  expect(await within(await screen.findByRole('button', { name: /2.*Yassine A\./ })).findByLabelText('Discipline −1')).toBeInTheDocument();
});
test('les élèves non placés restent accessibles sous le plan', async () => {
  const u = userEvent.setup();
  afficher();
  await u.click(await screen.findByRole('button', { name: 'Plan' }));
  const nonPlaces = await screen.findByRole('group', { name: 'Non placés' });
  await u.click(within(nonPlaces).getByRole('button', { name: /BENNANI/ }));
  expect(screen.getByRole('dialog', { name: /BENNANI/ })).toBeInTheDocument();
});
test('le choix Liste ou Plan est mémorisé par classe', async () => {
  const u = userEvent.setup();
  const premier = afficher();
  await u.click(await screen.findByRole('button', { name: 'Plan' }));
  await waitFor(async () => expect(await lireMeta(`vue:${classeId}`)).toBe('plan'));
  premier.unmount();
  afficher();
  expect(await screen.findByRole('group', { name: 'Plan de classe' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Liste' })).toBeInTheDocument();
});

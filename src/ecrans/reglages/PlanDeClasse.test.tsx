import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach } from 'vitest';
import type { Classe, Eleve } from '../../domaine/types';
import { enregistrer, lister, obtenir, viderBase } from '../../stockage/depot';
import PlanDeClasse from './PlanDeClasse';

let classeId = '';
beforeEach(async () => {
  await viderBase();
  classeId = (await enregistrer<Classe>('classes', { nom: '3AC-2', niveau: '3AC', annee: '2026-2027', archivee: false, plan_rangees: 2, plan_colonnes: 2 })).id;
  const e = (numero: number, nom: string, prenom: string, rangee: number | null, colonne: number | null) =>
    enregistrer<Eleve>('eleves', { classe_id: classeId, numero, nom, prenom, rangee, colonne, remarques: '' });
  await e(1, 'ALAOUI', 'Sara', 0, 0);
  await e(2, 'AMRANI', 'Yassine', null, null);
  await e(3, 'BENNANI', 'Salma', null, null);
});
const afficher = () => render(
  <MemoryRouter initialEntries={[`/reglages/classes/${classeId}/plan`]}>
    <Routes><Route path="/reglages/classes/:id/plan" element={<PlanDeClasse />} /></Routes>
  </MemoryRouter>,
);
const places = async () => Object.fromEntries((await lister<Eleve>('eleves', { classe_id: classeId })).map((e) => [e.numero, [e.rangee, e.colonne]]));

test('toucher un élève puis une place libre l’y installe', async () => {
  const u = userEvent.setup();
  afficher();
  await u.click(await screen.findByRole('button', { name: /2.*Yassine A\./ }));
  await u.click(screen.getByRole('button', { name: 'Place libre, rangée 2, colonne 1' }));
  await waitFor(async () => expect((await places())[2]).toEqual([1, 0]));
});
test('toucher un élève puis une place occupée échange les deux', async () => {
  const u = userEvent.setup();
  afficher();
  await u.click(await screen.findByRole('button', { name: /3.*Salma B\./ }));
  await u.click(within(screen.getByRole('group', { name: 'Plan de classe' })).getByRole('button', { name: /1.*Sara A\./ }));
  await waitFor(async () => expect(await places()).toMatchObject({ 3: [0, 0], 1: [null, null] }));
});
test('placer automatiquement', async () => {
  const u = userEvent.setup();
  afficher();
  await u.click(await screen.findByRole('button', { name: 'Placer automatiquement' }));
  await waitFor(async () => expect(await places()).toEqual({ 1: [0, 0], 2: [0, 1], 3: [1, 0] }));
});
test('changer le nombre de colonnes', async () => {
  const u = userEvent.setup();
  afficher();
  await u.click(await screen.findByRole('button', { name: 'Ajouter une colonne' }));
  await waitFor(async () => expect((await obtenir<Classe>('classes', classeId))!.plan_colonnes).toBe(3));
});

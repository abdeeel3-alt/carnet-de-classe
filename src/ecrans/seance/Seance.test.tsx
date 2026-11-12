import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach } from 'vitest';
import type { Classe, Eleve, Observation, Seance as S, TypeObservation } from '../../domaine/types';
import { enregistrer, initialiser, lister, modifier, viderBase } from '../../stockage/depot';
import Seance from './Seance';

let seanceId = '';
beforeEach(async () => {
  await viderBase();
  await initialiser();
  const c = await enregistrer<Classe>('classes', { nom: '3AC-2', niveau: '3AC', annee: '2026-2027', archivee: false, plan_rangees: 5, plan_colonnes: 6 });
  const noms = [['ALAOUI', 'Sara'], ['AMRANI', 'Yassine'], ['BENNANI', 'Salma'], ['CHRAIBI', 'Omar']];
  for (const [i, [nom, prenom]] of noms.entries()) {
    await enregistrer<Eleve>('eleves', { classe_id: c.id, numero: i + 1, nom, prenom, rangee: null, colonne: null, remarques: '' });
  }
  seanceId = (await enregistrer<S>('seances', { classe_id: c.id, creneau_id: null, debut: new Date().toISOString(), terminee: false })).id;
});

function afficher() {
  render(
    <MemoryRouter initialEntries={[`/seance/${seanceId}`]}>
      <Routes><Route path="/seance/:id" element={<Seance />} /></Routes>
    </MemoryRouter>,
  );
}
const ligne = (nom: string) => screen.findByRole('button', { name: new RegExp(nom) });
const observations = () => lister<Observation>('observations', { seance_id: seanceId });

test('une observation en deux gestes, puis annulation', async () => {
  const u = userEvent.setup();
  afficher();
  await u.click(await ligne('BENNANI'));
  await u.click(screen.getByRole('button', { name: /Sans uniforme/ }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  const salma = await ligne('BENNANI');
  expect(await within(salma).findByLabelText('Règlement −1')).toBeInTheDocument();
  expect(within(salma).getByLabelText('Total de la séance : −1')).toBeInTheDocument();
  await u.click(screen.getByRole('button', { name: 'Annuler' }));
  await waitFor(async () => expect(await observations()).toEqual([]));
  expect(within(await ligne('BENNANI')).queryByLabelText('Règlement −1')).not.toBeInTheDocument();
});

test('sélection multiple par appui long, puis Absent pour tous', async () => {
  const u = userEvent.setup();
  afficher();
  fireEvent.contextMenu(await ligne('ALAOUI'));
  await u.click(await ligne('AMRANI'));
  await u.click(await ligne('CHRAIBI'));
  await u.click(screen.getByRole('button', { name: 'Observation pour 3 élèves' }));
  await u.click(screen.getByRole('button', { name: /^Absent/ }));
  for (const nom of ['ALAOUI', 'AMRANI', 'CHRAIBI']) expect(await within(await ligne(nom)).findByLabelText('Absent')).toHaveTextContent('A');
  expect(within(await ligne('BENNANI')).queryByLabelText('Absent')).not.toBeInTheDocument();
  expect(await observations()).toHaveLength(3);
});

test('« + Autre » ajoute l’observation, l’applique et la garde dans la liste', async () => {
  const u = userEvent.setup();
  afficher();
  await u.click(await ligne('CHRAIBI'));
  await u.click(within(screen.getByRole('group', { name: 'Discipline' })).getByRole('button', { name: '+ Autre' }));
  await u.type(screen.getByLabelText('Observation'), 'Chewing-gum');
  await u.click(screen.getByRole('button', { name: 'Négative' }));
  await u.clear(screen.getByLabelText('Points'));
  await u.type(screen.getByLabelText('Points'), '1');
  await u.click(screen.getByRole('button', { name: 'Ajouter et appliquer' }));
  await waitFor(async () => expect(await observations()).toEqual([expect.objectContaining({ libelle: 'Chewing-gum', critere: 'discipline', points: -1 })]));
  await u.click(await ligne('ALAOUI'));
  expect(within(screen.getByRole('group', { name: 'Discipline' })).getByRole('button', { name: /Chewing-gum/ })).toBeInTheDocument();
});

test('les observations masquées ne sont pas proposées', async () => {
  const bavardage = (await lister<TypeObservation>('types_observation')).find((t) => t.libelle === 'Bavardage')!;
  await modifier<TypeObservation>('types_observation', bavardage.id, { masque: true });
  const u = userEvent.setup();
  afficher();
  await u.click(await ligne('ALAOUI'));
  expect(screen.getByRole('button', { name: /Perturbe le cours/ })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Bavardage/ })).not.toBeInTheDocument();
});

test('Absent est un interrupteur pour un élève seul', async () => {
  const u = userEvent.setup();
  afficher();
  await u.click(await ligne('ALAOUI'));
  await u.click(screen.getByRole('button', { name: /^Absent/ }));
  await within(await ligne('ALAOUI')).findByLabelText('Absent');
  await u.click(await ligne('ALAOUI'));
  expect(screen.getByRole('button', { name: /^Absent/ })).toHaveAttribute('aria-pressed', 'true');
  await u.click(screen.getByRole('button', { name: /^Absent/ }));
  await waitFor(async () => expect(await observations()).toEqual([]));
});

test('retirer une observation précise de la séance, sans toucher aux suivantes', async () => {
  const u = userEvent.setup();
  afficher();
  for (const quoi of [/Manque de respect/, /Bavardage/, /Bonne participation/]) {
    await u.click(await ligne('BENNANI'));
    await u.click(screen.getByRole('button', { name: quoi }));
  }
  await u.click(await ligne('BENNANI'));
  await u.click(await screen.findByRole('button', { name: 'Retirer Manque de respect' }));
  await waitFor(async () => expect((await observations()).map((o) => o.libelle).sort()).toEqual(['Bavardage', 'Bonne participation']));
});

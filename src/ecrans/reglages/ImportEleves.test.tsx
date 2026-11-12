import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import type { Classe, Eleve } from '../../domaine/types';
import { enregistrer, lister, viderBase } from '../../stockage/depot';
import ImportEleves from './ImportEleves';

let classeId = '';
beforeEach(async () => {
  await viderBase();
  classeId = (await enregistrer<Classe>('classes', { nom: '3AC-2', niveau: '3AC', annee: '2026-2027', archivee: false, plan_rangees: 5, plan_colonnes: 6 })).id;
});

function afficher() {
  render(
    <MemoryRouter initialEntries={[`/reglages/classes/${classeId}/import`]}>
      <Routes>
        <Route path="/reglages/classes/:id/import" element={<ImportEleves />} />
        <Route path="/reglages/classes/:id" element={<p>Liste des élèves</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
function fichierExcel(lignes: string[][]): File {
  const classeur = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(classeur, XLSX.utils.aoa_to_sheet(lignes), 'Feuille1');
  const octets = XLSX.write(classeur, { type: 'array', bookType: 'xlsx' });
  return new File([octets], 'liste.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

test('saisie manuelle : aperçu modifiable puis import', async () => {
  const u = userEvent.setup();
  afficher();
  await u.click(await screen.findByRole('tab', { name: 'Saisie' }));
  await u.type(screen.getByLabelText('Un élève par ligne'), 'ALAOUI Sara{enter}AMRANI Yassine');
  await u.click(screen.getByRole('button', { name: 'Aperçu' }));
  const lignes = within(screen.getByRole('table')).getAllByRole('row').slice(1);
  expect(lignes).toHaveLength(2);
  expect(within(lignes[0]).getByLabelText('Numéro')).toHaveValue(1);
  expect(within(lignes[1]).getByLabelText('Numéro')).toHaveValue(2);
  const prenom = within(lignes[1]).getByLabelText('Prénom');
  await u.clear(prenom);
  await u.type(prenom, 'Yasmine');
  await u.click(screen.getByRole('button', { name: 'Importer 2 élèves' }));
  await screen.findByText('Liste des élèves');
  const eleves = (await lister<Eleve>('eleves', { classe_id: classeId })).sort((a, b) => a.numero - b.numero);
  expect(eleves.map((e) => [e.numero, e.nom, e.prenom])).toEqual([[1, 'ALAOUI', 'Sara'], [2, 'AMRANI', 'Yasmine']]);
});

test('import dans une classe non vide : ajout à la suite', async () => {
  await enregistrer<Eleve>('eleves', { classe_id: classeId, numero: 7, nom: 'ZIANI', prenom: 'Adam', rangee: null, colonne: null, remarques: '' });
  const u = userEvent.setup();
  afficher();
  await u.click(await screen.findByRole('tab', { name: 'Saisie' }));
  await u.type(screen.getByLabelText('Un élève par ligne'), 'ALAOUI Sara');
  await u.click(screen.getByRole('button', { name: 'Aperçu' }));
  await u.click(screen.getByRole('button', { name: 'Importer 1 élève' }));
  await screen.findByText('Liste des élèves');
  expect((await lister<Eleve>('eleves', { classe_id: classeId })).map((e) => e.numero).sort()).toEqual([7, 8]);
});

test('fichier Excel reconnu : aperçu direct', async () => {
  const u = userEvent.setup();
  afficher();
  await u.upload(await screen.findByLabelText('Choisir un fichier Excel'), fichierExcel([['N°', 'Nom', 'Prénom'], ['1', 'BENNANI', 'Salma'], ['2', 'CHRAIBI', 'Omar']]));
  expect(await screen.findByRole('button', { name: 'Importer 2 élèves' })).toBeInTheDocument();
});

test('fichier sans en-tête reconnu : choix des colonnes', async () => {
  const u = userEvent.setup();
  afficher();
  await u.upload(await screen.findByLabelText('Choisir un fichier Excel'), fichierExcel([['BENNANI', 'Salma'], ['CHRAIBI', 'Omar']]));
  expect(await screen.findByText('Colonnes non reconnues')).toBeInTheDocument();
  await u.selectOptions(screen.getByLabelText('Colonne du nom'), '0');
  await u.selectOptions(screen.getByLabelText('Colonne du prénom'), '1');
  await u.click(screen.getByRole('button', { name: 'Aperçu' }));
  expect(await screen.findByRole('button', { name: 'Importer 2 élèves' })).toBeInTheDocument();
  expect(screen.getAllByLabelText('Nom').map((i) => (i as HTMLInputElement).value)).toEqual(['BENNANI', 'CHRAIBI']);
});

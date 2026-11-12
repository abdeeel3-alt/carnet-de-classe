import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach } from 'vitest';
import type { Attribution, Classe, Eleve, Seance as S, TypeObservation } from '../../domaine/types';
import { enregistrer, initialiser, lister, obtenir, viderBase } from '../../stockage/depot';
import { basculerPresence, observer } from './actions';
import ResumeSeance from './ResumeSeance';

let seanceId = '';
let salma = '';
beforeEach(async () => {
  await viderBase();
  await initialiser();
  const types = await lister<TypeObservation>('types_observation');
  const type = (l: string) => types.find((t) => t.libelle === l)!;
  const c = await enregistrer<Classe>('classes', { nom: '3AC-2', niveau: '3AC', annee: '2026-2027', archivee: false, plan_rangees: 5, plan_colonnes: 6 });
  const e = async (numero: number, nom: string, prenom: string) =>
    (await enregistrer<Eleve>('eleves', { classe_id: c.id, numero, nom, prenom, rangee: null, colonne: null, remarques: '' })).id;
  const sara = await e(1, 'ALAOUI', 'Sara');
  const yassine = await e(2, 'AMRANI', 'Yassine');
  salma = await e(3, 'BENNANI', 'Salma');
  seanceId = (await enregistrer<S>('seances', { classe_id: c.id, creneau_id: null, debut: new Date().toISOString(), terminee: false })).id;
  await basculerPresence(seanceId, sara, type('Absent'));
  await basculerPresence(seanceId, yassine, type('Retard'));
  for (let i = 0; i < 5; i++) await observer(seanceId, [salma], type('Bavardage'));
  await observer(seanceId, [yassine], type('Bonne participation'));
});
function afficher() {
  return render(
    <MemoryRouter initialEntries={[`/seance/${seanceId}/resume`]}>
      <Routes>
        <Route path="/seance/:id/resume" element={<ResumeSeance />} />
        <Route path="/" element={<p>Accueil</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
const attributions = () => lister<Attribution>('attributions', { eleve_id: salma });

test('résume les absents, les retards et les observations par critère', async () => {
  afficher();
  expect(await screen.findByLabelText('Absents : 1')).toHaveTextContent('ALAOUI Sara');
  expect(screen.getByLabelText('Retards : 1')).toHaveTextContent('AMRANI Yassine');
  expect(screen.getByLabelText('Discipline : 5 observations')).toBeInTheDocument();
  expect(screen.getByLabelText('Participation : 1 observation')).toBeInTheDocument();
});
test('valider une sanction proposée', async () => {
  const u = userEvent.setup();
  afficher();
  const proposition = await screen.findByRole('listitem', { name: /Avertissement.*BENNANI Salma/ });
  await u.click(within(proposition).getByRole('button', { name: 'Valider' }));
  await waitFor(async () => expect(await attributions()).toEqual([expect.objectContaining({ libelle: 'Avertissement', type: 'sanction', etat: 'validee' })]));
  await waitFor(() => expect(screen.queryByRole('listitem', { name: /Avertissement/ })).not.toBeInTheDocument());
});
test('une sanction refusée n’est pas reproposée', async () => {
  const u = userEvent.setup();
  const premier = afficher();
  await u.click(within(await screen.findByRole('listitem', { name: /Avertissement/ })).getByRole('button', { name: 'Refuser' }));
  await waitFor(async () => expect((await attributions())[0]).toMatchObject({ etat: 'refusee' }));
  premier.unmount();
  afficher();
  await screen.findByLabelText('Absents : 1');
  expect(screen.queryByRole('listitem', { name: /Avertissement/ })).not.toBeInTheDocument();
  expect(screen.getByText('Aucun badge ni sanction à proposer.')).toBeInTheDocument();
});
test('terminer marque la séance terminée et revient à l’accueil', async () => {
  const u = userEvent.setup();
  afficher();
  await u.click(await screen.findByRole('button', { name: 'Terminer' }));
  expect(await screen.findByText('Accueil')).toBeInTheDocument();
  expect((await obtenir<S>('seances', seanceId))!.terminee).toBe(true);
});

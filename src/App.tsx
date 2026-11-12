import { useEffect, useState } from 'react';
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import BarreNavigation from './composants/BarreNavigation';
import Accueil from './ecrans/Accueil';
import Connexion from './ecrans/Connexion';
import EmploiDuTemps from './ecrans/EmploiDuTemps';
import Exports from './ecrans/Exports';
import Catalogue from './ecrans/reglages/Catalogue';
import Classes from './ecrans/reglages/Classes';
import Eleves from './ecrans/reglages/Eleves';
import ImportEleves from './ecrans/reglages/ImportEleves';
import Parametres from './ecrans/reglages/Parametres';
import PlanDeClasse from './ecrans/reglages/PlanDeClasse';
import Regles from './ecrans/reglages/Regles';
import Reglages from './ecrans/reglages/Reglages';
import ResumeSeance from './ecrans/seance/ResumeSeance';
import Seance from './ecrans/seance/Seance';
import FicheEleve from './ecrans/eleve/FicheEleve';
import { ecrireMeta, initialiser, lireMeta, viderBase } from './stockage/depot';
import { client, distantSupabase } from './stockage/distant';
import { connexionDemandee, ecranDeDemarrage } from './stockage/session';
import { demarrerSynchro, signalerDeconnexion } from './stockage/synchro';

function AvecBarre() {
  return (<><Outlet /><BarreNavigation /></>);
}

export function Ecrans() {
  return (
    <Routes>
      <Route element={<AvecBarre />}>
        <Route path="/" element={<Accueil />} />
        <Route path="/emploi-du-temps" element={<EmploiDuTemps />} />
        <Route path="/exports" element={<Exports />} />
        <Route path="/reglages" element={<Reglages />} />
      </Route>
      <Route path="/seance/:id" element={<Seance />} />
      <Route path="/seance/:id/resume" element={<ResumeSeance />} />
      <Route path="/eleve/:id" element={<FicheEleve />} />
      <Route path="/reglages/regles" element={<Regles />} />
      <Route path="/reglages/catalogue" element={<Catalogue />} />
      <Route path="/reglages/classes" element={<Classes />} />
      <Route path="/reglages/classes/:id" element={<Eleves />} />
      <Route path="/reglages/classes/:id/import" element={<ImportEleves />} />
      <Route path="/reglages/classes/:id/plan" element={<PlanDeClasse />} />
      <Route path="/reglages/parametres" element={<Parametres />} />
    </Routes>
  );
}

type Etat = 'chargement' | 'deconnecte' | 'pret';

export default function App() {
  const [etat, setEtat] = useState<Etat>('chargement');
  const [dejaUtilise, setDejaUtilise] = useState(false);

  useEffect(() => {
    let arreter = () => {};
    let annule = false;
    async function demarrer(utilisateur: string | null) {
      // Un autre compte sur le même appareil : on repart d'une base locale vide.
      if (utilisateur && (await lireMeta('utilisateur')) !== utilisateur) {
        if (await lireMeta('utilisateur')) await viderBase();
        await ecrireMeta('utilisateur', utilisateur);
      }
      await initialiser();
      if (annule) return;
      arreter();
      arreter = demarrerSynchro(client && utilisateur ? distantSupabase(client) : null);
      setEtat('pret');
    }
    if (!client) { demarrer(null); return () => { annule = true; arreter(); }; }
    const { data } = client.auth.onAuthStateChange(async (_evenement, session) => {
      if (session) { demarrer(session.user.id); return; }
      // Pas de session : jeton expiré sans réseau, ou vraie déconnexion. Les données locales restent utilisables.
      arreter(); arreter = () => {};
      const local = await lireMeta('utilisateur');
      if (annule) return;
      setDejaUtilise(!!local);
      if (ecranDeDemarrage(local, null, connexionDemandee()).ecran === 'connexion') { setEtat('deconnecte'); return; }
      await initialiser();
      await signalerDeconnexion();
      if (!annule) setEtat('pret');
    });
    return () => { annule = true; data.subscription.unsubscribe(); arreter(); };
  }, []);

  if (etat === 'chargement') return <p className="vide">Chargement…</p>;
  if (etat === 'deconnecte') return <div className="appli"><Connexion client={client!} retourPossible={dejaUtilise} /></div>;
  return (
    <BrowserRouter>
      <div className="appli"><Ecrans /></div>
    </BrowserRouter>
  );
}

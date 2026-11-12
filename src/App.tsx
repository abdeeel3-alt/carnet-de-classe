import { useEffect, useState } from 'react';
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import BarreNavigation from './composants/BarreNavigation';
import Connexion from './ecrans/Connexion';
import Classes from './ecrans/reglages/Classes';
import Eleves from './ecrans/reglages/Eleves';
import ImportEleves from './ecrans/reglages/ImportEleves';
import Parametres from './ecrans/reglages/Parametres';
import Reglages from './ecrans/reglages/Reglages';
import { ecrireMeta, initialiser, lireMeta, viderBase } from './stockage/depot';
import { client, distantSupabase } from './stockage/distant';
import { demarrerSynchro } from './stockage/synchro';

function AvecBarre() {
  return (<><Outlet /><BarreNavigation /></>);
}

export function Ecrans() {
  return (
    <Routes>
      <Route element={<AvecBarre />}>
        <Route path="/reglages" element={<Reglages />} />
      </Route>
      <Route path="/reglages/classes" element={<Classes />} />
      <Route path="/reglages/classes/:id" element={<Eleves />} />
      <Route path="/reglages/classes/:id/import" element={<ImportEleves />} />
      <Route path="/reglages/parametres" element={<Parametres />} />
    </Routes>
  );
}

type Etat = 'chargement' | 'deconnecte' | 'pret';

export default function App() {
  const [etat, setEtat] = useState<Etat>('chargement');

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
    const { data } = client.auth.onAuthStateChange((_evenement, session) => {
      if (session) demarrer(session.user.id);
      else { arreter(); arreter = () => {}; setEtat('deconnecte'); }
    });
    return () => { annule = true; data.subscription.unsubscribe(); arreter(); };
  }, []);

  if (etat === 'chargement') return <p className="vide">Chargement…</p>;
  if (etat === 'deconnecte') return <div className="appli"><Connexion client={client!} /></div>;
  return (
    <BrowserRouter>
      <div className="appli"><Ecrans /></div>
    </BrowserRouter>
  );
}

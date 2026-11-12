import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import EnTete from '../composants/EnTete';
import IndicateurSynchro from '../composants/IndicateurSynchro';
import { creneauCourant, seancesDuJour } from '../domaine/emploiDuTemps';
import type { Classe, Creneau, Eleve } from '../domaine/types';
import { useListe } from '../stockage/hooks';
import { ouvrirSeance } from '../stockage/seances';

/** L'heure courante, rafraîchie toutes les 30 secondes et au retour sur l'application. */
function useMaintenant(): Date {
  const [maintenant, setMaintenant] = useState(() => new Date());
  useEffect(() => {
    const actualiser = () => setMaintenant(new Date());
    const minuteur = setInterval(actualiser, 30000);
    document.addEventListener('visibilitychange', actualiser);
    return () => { clearInterval(minuteur); document.removeEventListener('visibilitychange', actualiser); };
  }, []);
  return maintenant;
}

export default function Accueil() {
  const naviguer = useNavigate();
  const maintenant = useMaintenant();
  const classes = useListe<Classe>('classes');
  const creneaux = useListe<Creneau>('creneaux');
  const eleves = useListe<Eleve>('eleves');

  const actives = (classes ?? []).filter((c) => !c.archivee).sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true }));
  const parId = new Map(actives.map((c) => [c.id, c]));
  const utiles = (creneaux ?? []).filter((c) => parId.has(c.classe_id));
  const { enCours, prochain } = creneauCourant(utiles, maintenant);
  const duJour = seancesDuJour(utiles, maintenant);
  const vedette = enCours ?? prochain;
  const effectif = (id: string) => (eleves ?? []).filter((e) => e.classe_id === id).length;

  async function demarrer(classeId: string, creneau: Creneau | null) {
    const seance = await ouvrirSeance(classeId, new Date(), creneau);
    naviguer(`/seance/${seance.id}`);
  }

  const dateLongue = maintenant.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <>
      <EnTete titre="Carnet de classe" sousTitre={dateLongue}><IndicateurSynchro /></EnTete>
      <div className="contenu">
        {classes && !actives.length && (
          <div className="carte">
            <p>Bienvenue ! Créez votre première classe pour commencer.</p>
            <Link className="bouton primaire" to="/reglages/classes">Créer une classe</Link>
          </div>
        )}

        {vedette && (
          <section className="carte vedette" aria-label={enCours ? 'En cours' : 'Prochaine séance'}>
            <span className="doux">{enCours ? 'En cours' : 'Prochaine séance'}</span>
            <span className="gros">{parId.get(vedette.classe_id)!.nom}</span>
            <span>{vedette.debut} – {vedette.fin}{vedette.salle ? ` · Salle ${vedette.salle}` : ''}</span>
            <button type="button" className="bouton grand large" onClick={() => demarrer(vedette.classe_id, vedette)}>Démarrer</button>
          </section>
        )}

        {duJour.length > 0 && (
          <>
            <h2 className="titre-section">Aujourd’hui</h2>
            <ul className="liste">
              {duJour.map((c) => (
                <li key={c.id}>
                  <button type="button" className="ligne" aria-label={`Séance ${parId.get(c.classe_id)!.nom} de ${c.debut}`} onClick={() => demarrer(c.classe_id, c)}>
                    <span className="principal">
                      <strong>{c.debut} – {c.fin}</strong>
                      <span className="doux">{parId.get(c.classe_id)!.nom}{c.salle ? ` · Salle ${c.salle}` : ''}</span>
                    </span>
                    <span className="chevron" aria-hidden="true">›</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {actives.length > 0 && (
          <>
            <h2 className="titre-section">Mes classes</h2>
            {actives.map((c) => (
              <button key={c.id} type="button" className="carte cliquable" onClick={() => demarrer(c.id, null)}>
                <span className="gros">{c.nom}</span>
                <span className="doux">{c.niveau} · {effectif(c.id)} élève{effectif(c.id) > 1 ? 's' : ''} · toucher pour ouvrir une séance</span>
              </button>
            ))}
          </>
        )}
      </div>
    </>
  );
}

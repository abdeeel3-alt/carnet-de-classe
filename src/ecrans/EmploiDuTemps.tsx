import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EnTete from '../composants/EnTete';
import { JOURS } from '../domaine/emploiDuTemps';
import type { Classe, Creneau } from '../domaine/types';
import { useListe } from '../stockage/hooks';
import CreneauFormulaire from './CreneauFormulaire';

/** Vrai à partir de 700 px de large : on affiche alors la semaine entière. */
function useEcranLarge(): boolean {
  const requete = typeof window.matchMedia === 'function' ? window.matchMedia('(min-width: 700px)') : null;
  const [large, setLarge] = useState(requete?.matches ?? false);
  useEffect(() => {
    if (!requete) return;
    const suivre = () => setLarge(requete.matches);
    requete.addEventListener('change', suivre);
    return () => requete.removeEventListener('change', suivre);
  }, [requete]);
  return large;
}

export default function EmploiDuTemps() {
  const large = useEcranLarge();
  const classes = useListe<Classe>('classes');
  const creneaux = useListe<Creneau>('creneaux');
  const aujourdHui = new Date().getDay();
  const [jour, setJour] = useState<Creneau['jour']>((aujourdHui === 0 ? 1 : aujourdHui) as Creneau['jour']);
  const [formulaire, setFormulaire] = useState<{ creneau: Creneau | null; jour: Creneau['jour'] } | null>(null);

  const actives = (classes ?? []).filter((c) => !c.archivee).sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true }));
  const nom = (id: string) => (classes ?? []).find((c) => c.id === id)?.nom ?? 'Classe supprimée';
  const duJour = (j: number) => (creneaux ?? []).filter((c) => c.jour === j).sort((a, b) => a.debut.localeCompare(b.debut));

  const colonne = (j: Creneau['jour']) => (
    <div key={j} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {large && <h2 className="titre-section">{JOURS[j - 1].nom}</h2>}
      {duJour(j).map((c) => (
        <button key={c.id} type="button" className="creneau" onClick={() => setFormulaire({ creneau: c, jour: j })}>
          <strong>{c.debut} – {c.fin}</strong>
          <span className="doux">{nom(c.classe_id)}{c.salle ? ` · Salle ${c.salle}` : ''}</span>
        </button>
      ))}
      {!duJour(j).length && <p className="doux">{large ? '—' : 'Aucun créneau ce jour.'}</p>}
      {large && actives.length > 0 && <button type="button" className="bouton discret" aria-label={`Ajouter un créneau le ${JOURS[j - 1].nom}`} onClick={() => setFormulaire({ creneau: null, jour: j })}>+</button>}
    </div>
  );

  return (
    <>
      <EnTete titre="Emploi du temps" />
      <div className="contenu">
        {classes && !actives.length && (
          <div className="carte">
            <p>Créez d’abord une classe pour pouvoir placer des créneaux.</p>
            <Link className="bouton primaire" to="/reglages/classes">Créer une classe</Link>
          </div>
        )}
        {large ? (
          <div className="grille-semaine">{JOURS.map((j) => colonne(j.jour))}</div>
        ) : (
          <>
            <div className="options" role="tablist">
              {JOURS.map((j) => <button key={j.jour} type="button" role="tab" aria-selected={jour === j.jour} onClick={() => setJour(j.jour)}>{j.court}</button>)}
            </div>
            {colonne(jour)}
            {actives.length > 0 && <button type="button" className="bouton primaire" onClick={() => setFormulaire({ creneau: null, jour })}>+ Créneau</button>}
          </>
        )}
      </div>
      {formulaire && (
        <CreneauFormulaire creneau={formulaire.creneau} jourInitial={formulaire.jour} classes={actives} creneaux={creneaux ?? []} onFermer={() => setFormulaire(null)} />
      )}
    </>
  );
}

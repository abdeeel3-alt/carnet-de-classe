import { useState, type FormEvent } from 'react';
import EnTete from '../../composants/EnTete';
import Feuille from '../../composants/Feuille';
import { signe } from '../../domaine/texte';
import { CRITERES, NOM_CRITERE, type Critere, type TypeObservation } from '../../domaine/types';
import { modifier, supprimer } from '../../stockage/depot';
import { useListe } from '../../stockage/hooks';
import NouvelleObservation from '../seance/NouvelleObservation';

/** Les listes d'options proposées en séance : libellés, points, ordre, masquage. */
export default function Catalogue() {
  const types = useListe<TypeObservation>('types_observation');
  const [edition, setEdition] = useState<TypeObservation | null>(null);
  const [libelle, setLibelle] = useState('');
  const [points, setPoints] = useState('0');
  const [ajout, setAjout] = useState<Critere | null>(null);

  const duCritere = (c: Critere) => (types ?? []).filter((t) => t.critere === c).sort((a, b) => a.ordre - b.ordre);
  const ouvrir = (t: TypeObservation) => { setEdition(t); setLibelle(t.libelle); setPoints(String(t.points)); };

  async function valider(e: FormEvent) {
    e.preventDefault();
    if (!edition || !libelle.trim()) return;
    await modifier<TypeObservation>('types_observation', edition.id, { libelle: libelle.trim(), points: Math.round(Number(points.replace('−', '-')) || 0) });
    setEdition(null);
  }

  async function deplacer(sens: -1 | 1) {
    if (!edition) return;
    const groupe = duCritere(edition.critere);
    const voisin = groupe[groupe.findIndex((t) => t.id === edition.id) + sens];
    if (!voisin) return;
    await modifier<TypeObservation>('types_observation', edition.id, { ordre: voisin.ordre });
    await modifier<TypeObservation>('types_observation', voisin.id, { ordre: edition.ordre });
    setEdition(null);
  }

  return (
    <>
      <EnTete titre="Observations" retour="/reglages" />
      <div className="contenu">
        <p className="doux">Ces listes sont proposées en séance. Modifier les points ne change pas les observations déjà saisies.</p>
        {CRITERES.map((c) => (
          <div key={c} className={`groupe ${c}`} role="group" aria-label={NOM_CRITERE[c]}>
            <h3>{NOM_CRITERE[c]}</h3>
            <ul className="liste">
              {duCritere(c).map((t) => (
                <li key={t.id}>
                  <button type="button" className="ligne" onClick={() => ouvrir(t)}>
                    <span className="principal"><strong style={{ opacity: t.masque ? 0.45 : 1 }}>{t.libelle}{t.masque ? ' (masquée)' : ''}</strong></span>
                    <span className={`points ${t.points > 0 ? 'positif' : t.points < 0 ? 'negatif' : ''}`}>{signe(t.points)}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="bouton discret" aria-label={`Ajouter une observation : ${NOM_CRITERE[c]}`} onClick={() => setAjout(c)}>+ Ajouter</button>
          </div>
        ))}
      </div>

      {edition && (
        <Feuille titre="Modifier l’observation" onFermer={() => setEdition(null)}>
          <form onSubmit={valider} className="carte" style={{ border: 0, padding: 0 }}>
            <label className="champ"><span>Observation</span>
              <input required value={libelle} onChange={(e) => setLibelle(e.target.value)} />
            </label>
            <label className="champ"><span>Points</span>
              <input inputMode="text" value={points} onChange={(e) => setPoints(e.target.value)} />
            </label>
            <p className="doux">Nombre négatif pour retirer des points (par exemple -1), positif pour en donner, 0 pour seulement noter.</p>
            <button className="bouton primaire large">Enregistrer</button>
            <div className="rangee">
              <button type="button" className="bouton etire" onClick={() => deplacer(-1)}>Monter</button>
              <button type="button" className="bouton etire" onClick={() => deplacer(1)}>Descendre</button>
            </div>
            {!edition.code && (
              <div className="rangee">
                <button type="button" className="bouton etire" onClick={async () => { await modifier<TypeObservation>('types_observation', edition.id, { masque: !edition.masque }); setEdition(null); }}>
                  {edition.masque ? 'Réafficher' : 'Masquer'}
                </button>
                <button type="button" className="bouton danger" onClick={async () => {
                  if (window.confirm('Supprimer cette observation de la liste ? Les observations déjà saisies sont conservées.')) { await supprimer('types_observation', edition.id); setEdition(null); }
                }}>Supprimer</button>
              </div>
            )}
          </form>
        </Feuille>
      )}
      {ajout && <NouvelleObservation critere={ajout} libelleBouton="Ajouter" onCree={() => setAjout(null)} onFermer={() => setAjout(null)} />}
    </>
  );
}

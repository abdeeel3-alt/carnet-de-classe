import { useState, type FormEvent } from 'react';
import Feuille from '../../composants/Feuille';
import { NOM_CRITERE, type Critere, type TypeObservation } from '../../domaine/types';
import { enregistrer, lister } from '../../stockage/depot';
import BoutonMicro from './BoutonMicro';

interface Props {
  critere: Critere;
  libelleBouton: string;
  onCree: (t: TypeObservation) => void;
  onFermer: () => void;
}

/** Ajoute une observation au catalogue : elle restera proposée les fois suivantes. */
export default function NouvelleObservation({ critere, libelleBouton, onCree, onFermer }: Props) {
  const [libelle, setLibelle] = useState('');
  const [positive, setPositive] = useState(critere === 'participation');
  const [points, setPoints] = useState('1');

  async function valider(e: FormEvent) {
    e.preventDefault();
    if (!libelle.trim()) return;
    const existants = await lister<TypeObservation>('types_observation');
    const valeur = Math.abs(Math.round(Number(points) || 0));
    const type = await enregistrer<TypeObservation>('types_observation', {
      critere, libelle: libelle.trim(), points: positive ? valeur : -valeur,
      ordre: existants.reduce((m, t) => Math.max(m, t.ordre), -1) + 1, masque: false, synonymes: [], code: null,
    });
    onCree(type);
  }

  return (
    <Feuille titre={`Nouvelle observation · ${NOM_CRITERE[critere]}`} onFermer={onFermer}>
      <form onSubmit={valider} className="carte" style={{ border: 0, padding: 0 }}>
        <label className="champ"><span>Observation</span>
          <input autoFocus required value={libelle} onChange={(e) => setLibelle(e.target.value)} />
        </label>
        <BoutonMicro petit libelle="Dicter l’observation" onTextes={([texte]) => setLibelle(texte.charAt(0).toUpperCase() + texte.slice(1))} onErreur={() => {}} />
        <div className="options">
          <button type="button" aria-pressed={positive} onClick={() => setPositive(true)}>Positive</button>
          <button type="button" aria-pressed={!positive} onClick={() => setPositive(false)}>Négative</button>
        </div>
        <label className="champ"><span>Points</span>
          <input type="number" min={0} max={20} inputMode="numeric" value={points} onChange={(e) => setPoints(e.target.value)} />
        </label>
        <button className="bouton primaire large">{libelleBouton}</button>
      </form>
    </Feuille>
  );
}

import type { ReactNode } from 'react';
import Feuille from '../../composants/Feuille';
import { signe } from '../../domaine/texte';
import { CRITERES, NOM_CRITERE, type Critere, type TypeObservation } from '../../domaine/types';

interface Props {
  titre: string;
  types: TypeObservation[];
  /** Codes de présence actifs (élève seul) : le bouton correspondant apparaît enfoncé. */
  presenceActive: 'absent' | 'retard' | null;
  onChoisir: (t: TypeObservation) => void;
  onAutre: (c: Critere) => void;
  onFermer: () => void;
  pied?: ReactNode;
}

/** Les listes d'options, regroupées par critère ; chaque groupe se termine par « + Autre ». */
export default function PanneauObservations({ titre, types, presenceActive, onChoisir, onAutre, onFermer, pied }: Props) {
  const visibles = types.filter((t) => !t.masque).sort((a, b) => a.ordre - b.ordre);
  return (
    <Feuille titre={titre} onFermer={onFermer}>
      {CRITERES.map((c) => (
        <div key={c} className={`groupe ${c}`} role="group" aria-label={NOM_CRITERE[c]}>
          <h3>{NOM_CRITERE[c]}</h3>
          <div className="choix">
            {visibles.filter((t) => t.critere === c).map((t) => (
              <button key={t.id} type="button" aria-pressed={t.code ? presenceActive === t.code : undefined} onClick={() => onChoisir(t)}>
                <span>{t.libelle}</span>
                {t.points !== 0 && <b className={`points ${t.points > 0 ? 'positif' : 'negatif'}`}>{signe(t.points)}</b>}
              </button>
            ))}
            <button type="button" className="autre" onClick={() => onAutre(c)}>+ Autre</button>
          </div>
        </div>
      ))}
      {pied}
    </Feuille>
  );
}

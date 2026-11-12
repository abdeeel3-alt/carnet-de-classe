import type { Eleve, TypeObservation } from '../../domaine/types';

export type EtatVoix =
  | { sorte: 'applique'; texte: string }
  | { sorte: 'message'; texte: string }
  /** Une ambiguïté à lever : `entendu` désigne plusieurs élèves, ou plusieurs observations sont possibles. */
  | { sorte: 'choix-eleve'; entendu: string; candidats: Eleve[] }
  | { sorte: 'choix-type'; candidats: TypeObservation[] };

interface Props {
  etat: EtatVoix;
  onAnnuler: () => void;
  onChoisirEleve: (e: Eleve) => void;
  onChoisirType: (t: TypeObservation) => void;
  onFermer: () => void;
}

/** Ce que l'application a compris de la phrase dictée, et ce qu'elle attend éventuellement du professeur. */
export default function BandeauVoix({ etat, onAnnuler, onChoisirEleve, onChoisirType, onFermer }: Props) {
  return (
    <div className="bandeau" role="status" aria-label="Commande vocale">
      {etat.sorte === 'applique' && (
        <div className="rangee">
          <span className="etire">✓ {etat.texte}</span>
          <button type="button" className="bouton" onClick={onAnnuler}>Annuler</button>
        </div>
      )}
      {etat.sorte === 'message' && (
        <div className="rangee">
          <span className="etire">{etat.texte}</span>
          <button type="button" className="bouton" onClick={onFermer}>Fermer</button>
        </div>
      )}
      {etat.sorte === 'choix-eleve' && (
        <>
          <span>« {etat.entendu} » : quel élève ?</span>
          <div className="rangee">
            {etat.candidats.map((e) => (
              <button key={e.id} type="button" className="bouton" onClick={() => onChoisirEleve(e)}>{e.numero} · {e.nom} {e.prenom}</button>
            ))}
            <button type="button" className="bouton discret" style={{ color: '#fff' }} onClick={onFermer}>Ignorer</button>
          </div>
        </>
      )}
      {etat.sorte === 'choix-type' && (
        <>
          <span>Quelle observation ?</span>
          <div className="rangee">
            {etat.candidats.map((t) => <button key={t.id} type="button" className="bouton" onClick={() => onChoisirType(t)}>{t.libelle}</button>)}
            <button type="button" className="bouton discret" style={{ color: '#fff' }} onClick={onFermer}>Ignorer</button>
          </div>
        </>
      )}
    </div>
  );
}

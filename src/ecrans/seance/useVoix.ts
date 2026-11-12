import { useEffect, useRef, useState } from 'react';
import type { Eleve, TypeObservation } from '../../domaine/types';
import { interpreter, type Resultat } from '../../voix/interpreteur';
import { annulerDerniereAction, marquerPresence, observer } from './actions';
import type { EtatVoix } from './BandeauVoix';

/** Parmi les transcriptions possibles : la première comprise, sinon la première à préciser, sinon la première. */
export function meilleure(alternatives: string[], eleves: Eleve[], types: TypeObservation[]): Resultat {
  const resultats = alternatives.map((a) => interpreter(a, eleves, types));
  return resultats.find((r) => r.sorte === 'action') ?? resultats.find((r) => r.sorte === 'choix') ?? resultats[0] ?? { sorte: 'incompris', texte: '' };
}

interface EnAttente { eleveIds: string[]; ambigus: { entendu: string; candidats: string[] }[]; types: string[] }

/** Relie les phrases dictées aux actions de la séance, en demandant de préciser quand il y a un doute. */
export function useVoix(seanceId: string, elevesActuels: Eleve[], typesActuels: TypeObservation[]) {
  const [etat, setEtat] = useState<EtatVoix | null>(null);
  // L'écoute garde le rappel reçu à son démarrage : on lit toujours les listes à jour à travers ces références.
  const donnees = useRef({ eleves: elevesActuels, types: typesActuels });
  donnees.current = { eleves: elevesActuels, types: typesActuels };
  const enAttente = useRef<EnAttente | null>(null);
  const minuteur = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(minuteur.current), []);

  const afficher = (e: EtatVoix | null, duree?: number) => {
    clearTimeout(minuteur.current);
    setEtat(e);
    if (e && duree) minuteur.current = setTimeout(() => setEtat(null), duree);
  };

  async function appliquer(eleveIds: string[], typeId: string) {
    const { eleves, types } = donnees.current;
    const type = types.find((t) => t.id === typeId);
    if (!type || !eleveIds.length) return;
    // À la voix, Absent et Retard ne sont jamais retirés : répéter la phrase ne défait rien.
    if (type.code) await marquerPresence(seanceId, eleveIds, type);
    else await observer(seanceId, eleveIds, type);
    const noms = eleveIds.map((id) => eleves.find((e) => e.id === id)).filter((e): e is Eleve => !!e).map((e) => `${e.nom} ${e.prenom}`);
    afficher({ sorte: 'applique', texte: `${noms.join(', ')} : ${type.libelle}` }, 5000);
  }

  /** Avance dans les précisions demandées, puis applique. */
  function poursuivre() {
    const a = enAttente.current;
    if (!a) return;
    const { eleves, types } = donnees.current;
    if (a.ambigus.length) {
      const [premier] = a.ambigus;
      afficher({ sorte: 'choix-eleve', entendu: premier.entendu, candidats: eleves.filter((e) => premier.candidats.includes(e.id)) });
    } else if (a.types.length > 1) {
      afficher({ sorte: 'choix-type', candidats: types.filter((t) => a.types.includes(t.id)) });
    } else {
      enAttente.current = null;
      appliquer(a.eleveIds, a.types[0]);
    }
  }

  return {
    etat,
    surTextes(alternatives: string[]) {
      const r = meilleure(alternatives, donnees.current.eleves, donnees.current.types);
      enAttente.current = null;
      if (r.sorte === 'incompris') afficher({ sorte: 'message', texte: `Non compris : ${r.texte}` }, 6000);
      else if (r.sorte === 'action') appliquer(r.eleveIds, r.typeId);
      else { enAttente.current = { eleveIds: [...r.eleveIds], ambigus: [...r.eleves], types: [...r.types] }; poursuivre(); }
    },
    surErreur: (message: string) => afficher({ sorte: 'message', texte: message }, 6000),
    choisirEleve(e: Eleve) {
      const a = enAttente.current;
      if (!a) return;
      a.ambigus.shift();
      if (!a.eleveIds.includes(e.id)) a.eleveIds.push(e.id);
      poursuivre();
    },
    choisirType(t: TypeObservation) {
      const a = enAttente.current;
      if (!a) return;
      a.types = [t.id];
      poursuivre();
    },
    async annuler() { afficher(null); await annulerDerniereAction(seanceId); },
    fermer() { enAttente.current = null; afficher(null); },
  };
}

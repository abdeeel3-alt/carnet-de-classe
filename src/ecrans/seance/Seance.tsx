import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EnTete from '../../composants/EnTete';
import type { Classe, Critere, Eleve, Observation, Seance as S, TypeObservation } from '../../domaine/types';
import { ecrireMeta, lireMeta } from '../../stockage/depot';
import { useLigne, useListe } from '../../stockage/hooks';
import { annulerDerniereAction, basculerPresence, marquerPresence, observer } from './actions';
import ListeEleves from './ListeEleves';
import { parEleve } from './marques';
import NouvelleObservation from './NouvelleObservation';
import PanneauObservations from './PanneauObservations';
import PlanEleves from './PlanEleves';

export default function Seance() {
  const { id: seanceId = '' } = useParams();
  const seance = useLigne<S>('seances', seanceId);
  const classe = useLigne<Classe>('classes', seance?.classe_id);
  const eleves = useListe<Eleve>('eleves', { classe_id: seance?.classe_id ?? '' });
  const types = useListe<TypeObservation>('types_observation');
  const observations = useListe<Observation>('observations', { seance_id: seanceId });

  /** `null` : pas de mode sélection. */
  const [selection, setSelection] = useState<Set<string> | null>(null);
  /** Élèves visés par le panneau ouvert. */
  const [cibles, setCibles] = useState<string[] | null>(null);
  const [autre, setAutre] = useState<Critere | null>(null);
  const [vue, setVue] = useState<'liste' | 'plan'>('liste');

  // Le dernier choix Liste ou Plan est mémorisé par classe.
  const classeId = seance?.classe_id;
  useEffect(() => {
    if (classeId) lireMeta(`vue:${classeId}`).then((v) => setVue(v === 'plan' ? 'plan' : 'liste'));
  }, [classeId]);
  function changerVue() {
    const suivante = vue === 'liste' ? 'plan' : 'liste';
    setVue(suivante);
    if (classeId) ecrireMeta(`vue:${classeId}`, suivante);
  }

  const tries = useMemo(() => [...(eleves ?? [])].sort((a, b) => a.numero - b.numero), [eleves]);
  const obsParEleve = useMemo(() => parEleve(observations ?? []), [observations]);

  if (seance === null) return (<><EnTete titre="Séance introuvable" retour="/" /><p className="vide">Cette séance n’existe plus.</p></>);

  const fermer = () => { setCibles(null); setAutre(null); setSelection(null); };

  function toucher(e: Eleve) {
    if (!selection) { setCibles([e.id]); return; }
    const suivante = new Set(selection);
    if (!suivante.delete(e.id)) suivante.add(e.id);
    setSelection(suivante);
  }

  const appuiLong = (e: Eleve) => setSelection(new Set([...(selection ?? []), e.id]));

  async function choisir(type: TypeObservation) {
    const ids = cibles!;
    fermer();
    if (!type.code) await observer(seanceId, ids, type);
    else if (ids.length === 1) await basculerPresence(seanceId, ids[0], type);
    else await marquerPresence(seanceId, ids, type);
  }

  const seul = cibles?.length === 1 ? tries.find((e) => e.id === cibles[0]) : undefined;
  const presenceActive = seul ? ((obsParEleve.get(seul.id) ?? []).find((o) => o.code)?.code ?? null) : null;
  const debut = seance ? new Date(seance.debut) : null;
  const sousTitre = debut?.toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <EnTete titre={classe?.nom ?? '…'} sousTitre={sousTitre} retour="/">
        <button type="button" className="texte" onClick={changerVue}>{vue === 'liste' ? 'Plan' : 'Liste'}</button>
        <button type="button" className="texte" onClick={() => setSelection(selection ? null : new Set())}>{selection ? 'Terminé' : 'Sélectionner'}</button>
      </EnTete>

      {selection && (
        <div className="selection">
          <span>{selection.size} sélectionné{selection.size > 1 ? 's' : ''}</span>
          <button type="button" className="bouton primaire" disabled={!selection.size} onClick={() => setCibles([...selection])}>
            Observation pour {selection.size} élève{selection.size > 1 ? 's' : ''}
          </button>
        </div>
      )}

      <div className="contenu" style={{ paddingLeft: 0, paddingRight: 0, paddingTop: 0 }}>
        {eleves && !tries.length && (
          <div className="carte" style={{ margin: 16 }}>
            <p>Cette classe n’a pas encore d’élèves.</p>
            <Link className="bouton primaire" to={`/reglages/classes/${seance?.classe_id}`}>Ajouter des élèves</Link>
          </div>
        )}
        {vue === 'plan' && classe
          ? <PlanEleves eleves={tries} observations={obsParEleve} selection={selection} onToucher={toucher} onAppuiLong={appuiLong}
              rangees={classe.plan_rangees} colonnes={classe.plan_colonnes} />
          : <ListeEleves eleves={tries} observations={obsParEleve} selection={selection} onToucher={toucher} onAppuiLong={appuiLong} />}
      </div>

      <div className="barre-seance">
        <button type="button" className="bouton" disabled={!observations?.length} onClick={() => annulerDerniereAction(seanceId)}>Annuler</button>
        <span className="etire" style={{ flex: 1 }} />
        <Link className="bouton primaire" to={`/seance/${seanceId}/resume`}>Terminer la séance</Link>
      </div>

      {cibles && !autre && (
        <PanneauObservations
          titre={seul ? `${seul.numero} · ${seul.nom} ${seul.prenom}` : `${cibles.length} élèves`}
          types={types ?? []} presenceActive={presenceActive} onChoisir={choisir} onAutre={setAutre} onFermer={fermer}
          pied={seul && <Link className="bouton discret" to={`/eleve/${seul.id}`}>Voir la fiche de l’élève</Link>}
        />
      )}
      {cibles && autre && (
        <NouvelleObservation critere={autre} libelleBouton="Ajouter et appliquer" onCree={choisir} onFermer={fermer} />
      )}
    </>
  );
}

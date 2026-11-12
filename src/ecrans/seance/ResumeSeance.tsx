import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import EnTete from '../../composants/EnTete';
import { proposer, type Proposition } from '../../domaine/regles';
import { CRITERES, NOM_CRITERE, type Attribution, type Classe, type Eleve, type Observation, type Regle, type Seance } from '../../domaine/types';
import { enregistrer, lireParametres, lister, modifier, obtenir } from '../../stockage/depot';

async function charger(seanceId: string) {
  const seance = await obtenir<Seance>('seances', seanceId);
  if (!seance) return null;
  const classe = await obtenir<Classe>('classes', seance.classe_id);
  const eleves = (await lister<Eleve>('eleves', { classe_id: seance.classe_id })).sort((a, b) => a.numero - b.numero);
  const deLaSeance = await lister<Observation>('observations', { seance_id: seanceId });
  // Les règles portent sur la semaine, le mois ou le semestre : il faut tout l'historique des élèves de la classe.
  const historique: Observation[] = [];
  const attributions: Attribution[] = [];
  for (const e of eleves) {
    historique.push(...(await lister<Observation>('observations', { eleve_id: e.id })));
    attributions.push(...(await lister<Attribution>('attributions', { eleve_id: e.id })));
  }
  const propositions = proposer(await lister<Regle>('regles'), historique, attributions, new Date(), await lireParametres());
  return { seance, classe, eleves, deLaSeance, propositions };
}

export default function ResumeSeance() {
  const { id: seanceId = '' } = useParams();
  const naviguer = useNavigate();
  const d = useLiveQuery(() => charger(seanceId), [seanceId]);

  if (d === null) return (<><EnTete titre="Séance introuvable" retour="/" /><p className="vide">Cette séance n’existe plus.</p></>);
  if (!d) return <EnTete titre="Fin de séance" retour={`/seance/${seanceId}`} />;

  const nom = (id: string) => { const e = d.eleves.find((x) => x.id === id); return e ? `${e.nom} ${e.prenom}` : 'Élève retiré'; };
  const avecCode = (code: 'absent' | 'retard') => d.deLaSeance.filter((o) => o.code === code).map((o) => nom(o.eleve_id));
  const absents = avecCode('absent');
  const retards = avecCode('retard');
  const nombre = (c: (typeof CRITERES)[number]) => d.deLaSeance.filter((o) => o.critere === c && !o.code).length;

  const decider = (p: Proposition, etat: 'validee' | 'refusee') => enregistrer<Attribution>('attributions', {
    eleve_id: p.eleve_id, regle_id: p.regle_id, libelle: p.libelle, type: p.type, date: new Date().toISOString(), etat, cle_periode: p.cle_periode,
  });

  async function terminer() {
    await modifier<Seance>('seances', seanceId, { terminee: true });
    naviguer('/');
  }

  return (
    <>
      <EnTete titre="Fin de séance" sousTitre={d.classe?.nom} retour={`/seance/${seanceId}`} />
      <div className="contenu">
        <div className="carte" aria-label={`Absents : ${absents.length}`}>
          <strong>Absents : {absents.length}</strong>
          {absents.length > 0 && <p className="doux">{absents.join(', ')}</p>}
        </div>
        <div className="carte" aria-label={`Retards : ${retards.length}`}>
          <strong>Retards : {retards.length}</strong>
          {retards.length > 0 && <p className="doux">{retards.join(', ')}</p>}
        </div>
        <div className="totaux">
          {CRITERES.filter((c) => c !== 'presence').map((c) => (
            <div key={c} className={`total ${c}`} aria-label={`${NOM_CRITERE[c]} : ${nombre(c)} observation${nombre(c) > 1 ? 's' : ''}`}>
              <span>{NOM_CRITERE[c]}</span><b>{nombre(c)}</b>
            </div>
          ))}
        </div>

        <h2 className="titre-section">Badges et sanctions proposés</h2>
        {!d.propositions.length && <p className="doux">Aucun badge ni sanction à proposer.</p>}
        {d.propositions.length > 0 && (
          <ul className="liste">
            {d.propositions.map((p) => (
              <li key={`${p.eleve_id}-${p.regle_id}`} aria-label={`${p.libelle} pour ${nom(p.eleve_id)}`} style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="rangee">
                  <span className={`etiquette ${p.type}`}>{p.type === 'badge' ? '★ Badge' : '⚠ Sanction'}</span>
                  <strong>{p.libelle}</strong>
                </div>
                <span>{nom(p.eleve_id)}</span>
                <div className="rangee">
                  <button type="button" className="bouton primaire etire" onClick={() => decider(p, 'validee')}>Valider</button>
                  <button type="button" className="bouton etire" onClick={() => decider(p, 'refusee')}>Refuser</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="bouton primaire grand" onClick={terminer}>Terminer</button>
      </div>
    </>
  );
}

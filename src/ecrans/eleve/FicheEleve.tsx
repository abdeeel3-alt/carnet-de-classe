import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import EnTete from '../../composants/EnTete';
import Feuille from '../../composants/Feuille';
import SelecteurPeriode from '../../composants/SelecteurPeriode';
import { clePeriode, libellePeriode, type ChoixPeriode } from '../../domaine/periodes';
import { signe } from '../../domaine/texte';
import { CRITERES, NOM_CRITERE, type Attribution, type Eleve } from '../../domaine/types';
import { enregistrer, modifier, supprimer } from '../../stockage/depot';
import { useParametres } from '../../stockage/hooks';
import '../../impression.css';
import BoutonMicro from '../seance/BoutonMicro';
import { donneesFiche } from './donneesFiche';

const jour = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function FicheEleve() {
  const { id: eleveId = '' } = useParams();
  const p = useParametres();
  const [choix, setChoix] = useState<ChoixPeriode | null>(null);
  const [attribution, setAttribution] = useState(false);
  const [type, setType] = useState<Attribution['type']>('badge');
  const [intitule, setIntitule] = useState('');

  // Par défaut : le semestre en cours.
  const periode: ChoixPeriode | null = choix ?? (p ? { type: clePeriode('semestre', new Date(), p) as 'semestre1' | 'semestre2' } : null);
  const d = useLiveQuery(async () => (periode ? donneesFiche(eleveId, periode, new Date()) : undefined), [eleveId, JSON.stringify(periode)]);

  if (d === null) return (<><EnTete titre="Élève introuvable" retour /><p className="vide">Cet élève n’existe plus.</p></>);
  if (!d || !periode || !p) return <EnTete titre="Fiche élève" retour />;

  async function attribuer(e: FormEvent) {
    e.preventDefault();
    if (!intitule.trim()) return;
    await enregistrer<Attribution>('attributions', {
      eleve_id: eleveId, regle_id: null, libelle: intitule.trim(), type, date: new Date().toISOString(), etat: 'validee', cle_periode: '',
    });
    setIntitule(''); setAttribution(false);
  }

  const { eleve, classe, totaux } = d;
  return (
    <>
      <EnTete titre={`${eleve.nom} ${eleve.prenom}`} sousTitre={`N° ${eleve.numero} · ${classe.nom}`} retour>
        <button type="button" className="texte" onClick={() => window.print()}>Imprimer / PDF</button>
      </EnTete>
      <div className="contenu">
        <div className="impression-seule">
          <p>{[p.etablissement, p.professeur, p.matiere].filter(Boolean).join(' · ')}</p>
          <h1>{eleve.nom} {eleve.prenom} — N° {eleve.numero} — {classe.nom}</h1>
        </div>
        <SelecteurPeriode valeur={periode} onChange={setChoix} />
        <p className="doux">Période {libellePeriode(d.intervalle)}</p>

        <div className="totaux">
          {CRITERES.map((c) => (
            <div key={c} className={`total ${c}`} aria-label={`${NOM_CRITERE[c]} : ${signe(totaux.parCritere[c])}`}>
              <span>{NOM_CRITERE[c]}</span><b>{signe(totaux.parCritere[c])}</b>
            </div>
          ))}
          <div className="total general" aria-label={`Total : ${signe(totaux.total)}`}><span>Total</span><b>{signe(totaux.total)}</b></div>
        </div>

        <div className="carte">
          <strong>Absences : {totaux.absences} · Retards : {totaux.retards}</strong>
          {d.absences.length > 0 && <p className="doux">Absent le {d.absences.map((o) => jour(o.horodatage)).join(', ')}</p>}
          {d.retards.length > 0 && <p className="doux">En retard le {d.retards.map((o) => jour(o.horodatage)).join(', ')}</p>}
        </div>

        <h2 className="titre-section">Badges et sanctions</h2>
        <div className="carte">
          {!d.attributions.length && <p className="doux">Aucun sur cette période.</p>}
          {d.attributions.map((a) => (
            <div key={a.id} className="rangee">
              <span className={`etiquette ${a.type}`}>{a.type === 'badge' ? '★ Badge' : '⚠ Sanction'}</span>
              <span className="etire">{a.libelle}</span>
              <span className="doux">{jour(a.date)}</span>
            </div>
          ))}
          <button type="button" className="bouton sans-impression" onClick={() => setAttribution(true)}>Attribuer un badge ou une sanction</button>
        </div>

        <h2 className="titre-section">Observations</h2>
        {!d.observations.length && <p className="vide">Aucune observation sur cette période.</p>}
        {d.observations.length > 0 && (
          <ul className="liste">
            {d.observations.map((o) => (
              <li key={o.id} className="ligne" style={{ cursor: 'default' }}>
                <span className={`pastille ${o.critere}`}>{NOM_CRITERE[o.critere].slice(0, 4)}</span>
                <span className="principal"><strong>{o.libelle}</strong><span className="doux">{jour(o.horodatage)}</span></span>
                {o.points !== 0 && <span className={`points ${o.points > 0 ? 'positif' : 'negatif'}`}>{signe(o.points)}</span>}
                <button type="button" className="bouton discret sans-impression" style={{ color: 'var(--danger)', padding: '0 10px' }}
                  aria-label={`Supprimer l’observation ${o.libelle}`}
                  onClick={() => window.confirm(`Supprimer « ${o.libelle} » du ${jour(o.horodatage)} ?`) && supprimer('observations', o.id)}>✕</button>
              </li>
            ))}
          </ul>
        )}

        <h2 className="titre-section">Remarques</h2>
        <label className="champ">
          <span className="sans-impression">Remarques</span>
          <textarea key={eleve.updated_at} defaultValue={eleve.remarques}
            onBlur={(e) => e.target.value !== eleve.remarques && modifier<Eleve>('eleves', eleve.id, { remarques: e.target.value })} />
        </label>
        <span className="sans-impression">
          <BoutonMicro petit libelle="Dicter une remarque" onErreur={() => {}}
            onTextes={([texte]) => modifier<Eleve>('eleves', eleve.id, { remarques: [eleve.remarques, texte].filter(Boolean).join(' ') })} />
        </span>
      </div>

      {attribution && (
        <Feuille titre="Attribuer" onFermer={() => setAttribution(false)}>
          <form onSubmit={attribuer} className="carte" style={{ border: 0, padding: 0 }}>
            <div className="options">
              <button type="button" aria-pressed={type === 'badge'} onClick={() => setType('badge')}>Badge</button>
              <button type="button" aria-pressed={type === 'sanction'} onClick={() => setType('sanction')}>Sanction</button>
            </div>
            <label className="champ"><span>Intitulé</span>
              <input autoFocus required value={intitule} onChange={(e) => setIntitule(e.target.value)} />
            </label>
            <button className="bouton primaire large">Attribuer</button>
          </form>
        </Feuille>
      )}
    </>
  );
}

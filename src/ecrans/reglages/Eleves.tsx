import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import EnTete from '../../composants/EnTete';
import Feuille from '../../composants/Feuille';
import type { Classe, Creneau, Eleve, Seance } from '../../domaine/types';
import { enregistrer, lister, modifier, supprimer } from '../../stockage/depot';
import { useLigne, useListe } from '../../stockage/hooks';

type Brouillon = { id?: string; numero: string; nom: string; prenom: string };

export default function Eleves() {
  const { id: classeId = '' } = useParams();
  const naviguer = useNavigate();
  const classe = useLigne<Classe>('classes', classeId);
  const eleves = useListe<Eleve>('eleves', { classe_id: classeId });
  const [fiche, setFiche] = useState<Brouillon | null>(null);
  const [reglageClasse, setReglageClasse] = useState(false);
  const [nomClasse, setNomClasse] = useState('');
  const [confirmation, setConfirmation] = useState('');

  if (classe === null) return (<><EnTete titre="Classe introuvable" retour="/reglages/classes" /><p className="vide">Cette classe n’existe plus.</p></>);
  const tries = [...(eleves ?? [])].sort((a, b) => a.numero - b.numero);
  const prochain = tries.reduce((m, e) => Math.max(m, e.numero), 0) + 1;

  async function validerEleve(e: FormEvent) {
    e.preventDefault();
    if (!fiche || !fiche.nom.trim()) return;
    const champs = { numero: Number(fiche.numero) || prochain, nom: fiche.nom.trim(), prenom: fiche.prenom.trim() };
    if (fiche.id) await modifier<Eleve>('eleves', fiche.id, champs);
    else await enregistrer<Eleve>('eleves', { classe_id: classeId, ...champs, rangee: null, colonne: null, remarques: '' });
    setFiche(null);
  }

  async function renumeroter() {
    if (!window.confirm('Renuméroter de 1 à n dans l’ordre alphabétique (nom puis prénom) ?')) return;
    const alpha = [...tries].sort((a, b) => a.nom.localeCompare(b.nom, 'fr') || a.prenom.localeCompare(b.prenom, 'fr'));
    for (const [i, e] of alpha.entries()) if (e.numero !== i + 1) await modifier<Eleve>('eleves', e.id, { numero: i + 1 });
  }

  async function supprimerClasse() {
    for (const e of tries) await supprimer('eleves', e.id);
    for (const c of await lister<Creneau>('creneaux', { classe_id: classeId })) await supprimer('creneaux', c.id);
    for (const s of await lister<Seance>('seances', { classe_id: classeId })) await supprimer('seances', s.id);
    await supprimer('classes', classeId);
    naviguer('/reglages/classes');
  }

  return (
    <>
      <EnTete titre={classe?.nom ?? '…'} sousTitre={`${tries.length} élève${tries.length > 1 ? 's' : ''}`} retour="/reglages/classes">
        <button type="button" className="texte" onClick={() => { setNomClasse(classe?.nom ?? ''); setConfirmation(''); setReglageClasse(true); }}>Classe</button>
      </EnTete>
      <div className="contenu">
        <div className="rangee">
          <button type="button" className="bouton primaire" onClick={() => setFiche({ numero: String(prochain), nom: '', prenom: '' })}>+ Élève</button>
          <Link className="bouton" to={`/reglages/classes/${classeId}/import`}>Importer</Link>
          <Link className="bouton" to={`/reglages/classes/${classeId}/plan`}>Plan de classe</Link>
          {tries.length > 1 && <button type="button" className="bouton" onClick={renumeroter}>Renuméroter</button>}
        </div>
        {eleves && !tries.length && <p className="vide">Aucun élève. Ajoutez-les un par un ou importez une liste.</p>}
        {tries.length > 0 && (
          <ul className="liste">
            {tries.map((e) => (
              <li key={e.id}>
                <button type="button" className="ligne" onClick={() => setFiche({ id: e.id, numero: String(e.numero), nom: e.nom, prenom: e.prenom })}>
                  <span className="numero">{e.numero}</span>
                  <span className="principal"><strong>{e.nom} {e.prenom}</strong></span>
                  <span className="chevron" aria-hidden="true">›</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {fiche && (
        <Feuille titre={fiche.id ? 'Modifier l’élève' : 'Nouvel élève'} onFermer={() => setFiche(null)}>
          <form onSubmit={validerEleve} className="carte" style={{ border: 0, padding: 0 }}>
            <label className="champ"><span>Numéro</span>
              <input type="number" min={1} value={fiche.numero} onChange={(e) => setFiche({ ...fiche, numero: e.target.value })} />
            </label>
            <label className="champ"><span>Nom</span>
              <input autoFocus required value={fiche.nom} onChange={(e) => setFiche({ ...fiche, nom: e.target.value })} />
            </label>
            <label className="champ"><span>Prénom</span>
              <input value={fiche.prenom} onChange={(e) => setFiche({ ...fiche, prenom: e.target.value })} />
            </label>
            <button className="bouton primaire large">Enregistrer</button>
            {fiche.id && (
              <div className="rangee">
                <Link className="bouton etire" to={`/eleve/${fiche.id}`}>Voir la fiche</Link>
                <button type="button" className="bouton danger" onClick={async () => {
                  if (window.confirm('Retirer cet élève de la classe ? Son historique est conservé dans les sauvegardes.')) { await supprimer('eleves', fiche.id!); setFiche(null); }
                }}>Retirer</button>
              </div>
            )}
          </form>
        </Feuille>
      )}

      {reglageClasse && classe && (
        <Feuille titre="Réglages de la classe" onFermer={() => setReglageClasse(false)}>
          <label className="champ"><span>Nom de la classe</span>
            <input value={nomClasse} onChange={(e) => setNomClasse(e.target.value)} />
          </label>
          <div className="rangee">
            <button type="button" className="bouton primaire etire" disabled={!nomClasse.trim()} onClick={async () => { await modifier<Classe>('classes', classeId, { nom: nomClasse.trim() }); setReglageClasse(false); }}>Renommer</button>
            <button type="button" className="bouton" onClick={async () => { await modifier<Classe>('classes', classeId, { archivee: !classe.archivee }); setReglageClasse(false); }}>
              {classe.archivee ? 'Désarchiver' : 'Archiver'}
            </button>
          </div>
          <div className="carte" style={{ borderColor: 'var(--danger)' }}>
            <strong>Supprimer la classe</strong>
            <p className="doux">La classe, ses élèves, ses créneaux et ses séances disparaîtront de l’application. Pensez d’abord à <Link to="/exports" style={{ textDecoration: 'underline' }}>exporter vos données</Link>.</p>
            <label className="champ"><span>Tapez SUPPRIMER pour confirmer</span>
              <input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
            </label>
            <button type="button" className="bouton danger" disabled={confirmation.trim() !== 'SUPPRIMER'} onClick={supprimerClasse}>Supprimer définitivement</button>
          </div>
        </Feuille>
      )}
    </>
  );
}

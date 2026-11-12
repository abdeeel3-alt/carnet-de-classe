import { useState } from 'react';
import EnTete from '../composants/EnTete';
import SelecteurPeriode from '../composants/SelecteurPeriode';
import type { ChoixPeriode } from '../domaine/periodes';
import type { Classe, Eleve } from '../domaine/types';
import { EXPORTS, type SorteExport } from '../export/liste';
import { useListe } from '../stockage/hooks';

/** Choix d'un export Excel, prêt à imprimer en A4. */
export default function Exports() {
  const classes = useListe<Classe>('classes');
  const [sorte, setSorte] = useState<SorteExport>('bilan');
  const [classeChoisie, setClasseChoisie] = useState('');
  const [eleveId, setEleveId] = useState('');
  const [choix, setChoix] = useState<ChoixPeriode>({ type: 'mois' });
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);

  const triees = [...(classes ?? [])].sort((a, b) => Number(a.archivee) - Number(b.archivee) || a.nom.localeCompare(b.nom, 'fr', { numeric: true }));
  const classeId = classeChoisie || triees[0]?.id || '';
  const eleves = useListe<Eleve>('eleves', { classe_id: classeId });
  const reglage = EXPORTS.find((e) => e.sorte === sorte)!;

  async function lancer() {
    setErreur(''); setOccupe(true);
    try {
      // Le moteur Excel est volumineux : il n'est chargé qu'au premier export.
      const [{ preparerExport }, { telecharger }] = await Promise.all([import('../export/donnees'), import('../export/telecharger')]);
      const { classeur, nomFichier } = await preparerExport(sorte, { classeId, eleveId, choix }, new Date());
      await telecharger(classeur, nomFichier);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'L’export a échoué.');
    } finally { setOccupe(false); }
  }

  return (
    <>
      <EnTete titre="Exports Excel" />
      <div className="contenu">
        <p className="doux">Fichiers en couleurs, prêts à imprimer au format A4.</p>
        <ul className="liste">
          {EXPORTS.map((e) => (
            <li key={e.sorte}>
              <button type="button" className="ligne" aria-pressed={sorte === e.sorte} style={sorte === e.sorte ? { background: 'var(--primaire-clair)' } : undefined}
                onClick={() => { setSorte(e.sorte); setErreur(''); }}>
                <span className="principal"><strong>{e.nom}</strong><span className="doux">{e.detail}</span></span>
                {sorte === e.sorte && <span aria-hidden="true">✓</span>}
              </button>
            </li>
          ))}
        </ul>

        {reglage.classe && (
          <label className="champ"><span>Classe</span>
            <select value={classeId} onChange={(e) => { setClasseChoisie(e.target.value); setEleveId(''); }}>
              {!triees.length && <option value="">Aucune classe</option>}
              {triees.map((c) => <option key={c.id} value={c.id}>{c.nom}{c.archivee ? ' (archivée)' : ''}</option>)}
            </select>
          </label>
        )}
        {reglage.eleve && (
          <label className="champ"><span>Élève</span>
            <select value={eleveId} onChange={(e) => setEleveId(e.target.value)}>
              <option value="">Choisir…</option>
              {[...(eleves ?? [])].sort((a, b) => a.numero - b.numero).map((e) => <option key={e.id} value={e.id}>{e.numero} · {e.nom} {e.prenom}</option>)}
            </select>
          </label>
        )}
        {reglage.periode && <SelecteurPeriode valeur={choix} onChange={setChoix} />}
        {erreur && <p className="erreur" role="alert">{erreur}</p>}
        <button type="button" className="bouton primaire grand" disabled={occupe} onClick={lancer}>
          {occupe ? 'Préparation…' : 'Télécharger le fichier Excel'}
        </button>
        <p className="doux">L’en-tête des documents (établissement, professeur, matière) se règle dans Réglages › Paramètres.</p>
      </div>
    </>
  );
}

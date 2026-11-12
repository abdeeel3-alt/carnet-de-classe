import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EnTete from '../../composants/EnTete';
import type { Eleve } from '../../domaine/types';
import { lireImage, lireTableur } from '../../import/fichiers';
import { depuisTableau, detecterColonnes, type Correspondance, type EleveBrouillon } from '../../import/tableau';
import { depuisTexte } from '../../import/texte';
import { enregistrer, lister } from '../../stockage/depot';

type Onglet = 'Fichier' | 'Photo' | 'Saisie';
const ONGLETS: Onglet[] = ['Fichier', 'Photo', 'Saisie'];

/** Les trois modes d'import aboutissent au même aperçu modifiable avant validation. */
export default function ImportEleves() {
  const { id: classeId = '' } = useParams();
  const naviguer = useNavigate();
  const [onglet, setOnglet] = useState<Onglet>('Fichier');
  const [saisie, setSaisie] = useState('');
  const [apercu, setApercu] = useState<EleveBrouillon[] | null>(null);
  const [aAssocier, setAAssocier] = useState<string[][] | null>(null);
  const [colonnes, setColonnes] = useState({ nom: '', prenom: '', numero: '' });
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState('');

  const changerOnglet = (o: Onglet) => { setOnglet(o); setApercu(null); setAAssocier(null); setErreur(''); };

  async function choisirTableur(fichier: File | undefined) {
    if (!fichier) return;
    setErreur(''); setApercu(null); setAAssocier(null); setOccupe('Lecture du fichier…');
    try {
      const lignes = (await lireTableur(fichier)).filter((l) => l.some((c) => c));
      if (!lignes.length) { setErreur('Ce fichier est vide.'); return; }
      const c = detecterColonnes(lignes);
      if (c) setApercu(depuisTableau(lignes, c));
      else setAAssocier(lignes);
    } catch {
      setErreur('Fichier illisible. Vérifiez son format, ou utilisez la saisie manuelle.');
    } finally { setOccupe(''); }
  }

  async function choisirPhoto(fichier: File | undefined) {
    if (!fichier) return;
    setErreur(''); setApercu(null); setOccupe('Lecture de la photo… (jusqu’à une minute)');
    try {
      const eleves = depuisTexte(await lireImage(fichier));
      if (eleves.length) setApercu(eleves);
      else setErreur('Aucun nom lu sur cette photo. Essayez une photo plus nette, bien à plat.');
    } catch {
      setErreur('Lecture impossible. La lecture de photo a besoin d’Internet.');
    } finally { setOccupe(''); }
  }

  function associer() {
    if (!aAssocier || colonnes.nom === '') { setErreur('Choisissez au moins la colonne du nom.'); return; }
    const n = (v: string) => (v === '' ? null : Number(v));
    const c: Correspondance = { ligneEntetes: -1, nom: n(colonnes.nom), prenom: n(colonnes.prenom), numero: n(colonnes.numero), nomComplet: null };
    setErreur('');
    setApercu(depuisTableau(aAssocier, c));
  }

  const changer = (i: number, champ: keyof EleveBrouillon, valeur: string) =>
    setApercu((a) => a!.map((e, j) => (j === i ? { ...e, [champ]: champ === 'numero' ? Number(valeur) : valeur } : e)));

  async function importer() {
    const valides = apercu!.filter((e) => e.nom.trim());
    const existants = await lister<Eleve>('eleves', { classe_id: classeId });
    const dernier = existants.reduce((m, e) => Math.max(m, e.numero), 0);
    for (const [i, e] of valides.entries()) {
      await enregistrer<Eleve>('eleves', {
        classe_id: classeId, numero: dernier ? dernier + i + 1 : e.numero || i + 1,
        nom: e.nom.trim(), prenom: e.prenom.trim(), rangee: null, colonne: null, remarques: '',
      });
    }
    naviguer(`/reglages/classes/${classeId}`);
  }

  const largeur = aAssocier ? Math.max(...aAssocier.map((l) => l.length)) : 0;
  const optionsColonnes = Array.from({ length: largeur }, (_, i) => (
    <option key={i} value={i}>Colonne {i + 1} — {aAssocier?.[0]?.[i] || 'vide'}</option>
  ));
  const nombre = apercu?.filter((e) => e.nom.trim()).length ?? 0;

  return (
    <>
      <EnTete titre="Importer des élèves" retour={`/reglages/classes/${classeId}`} />
      <div className="contenu">
        <div className="options" role="tablist">
          {ONGLETS.map((o) => (
            <button key={o} type="button" role="tab" aria-selected={onglet === o} onClick={() => changerOnglet(o)}>{o}</button>
          ))}
        </div>

        {onglet === 'Fichier' && !apercu && (
          <div className="carte">
            <label className="champ">
              <span>Choisir un fichier Excel</span>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => choisirTableur(e.target.files?.[0])} />
            </label>
            <p className="doux">Fichier exporté de Massar ou liste personnelle (.xlsx, .xls, .csv).</p>
          </div>
        )}
        {onglet === 'Photo' && !apercu && (
          <div className="carte">
            <label className="champ">
              <span>Prendre ou choisir une photo de la liste</span>
              <input type="file" accept="image/*" onChange={(e) => choisirPhoto(e.target.files?.[0])} />
            </label>
            <p className="doux">Liste imprimée, en caractères latins, bien éclairée et à plat. Vous corrigerez dans l’aperçu.</p>
          </div>
        )}
        {onglet === 'Saisie' && !apercu && (
          <div className="carte">
            <label className="champ">
              <span>Un élève par ligne</span>
              <textarea value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder={'ALAOUI Sara\nAMRANI Yassine'} />
            </label>
            <button type="button" className="bouton primaire" onClick={() => setApercu(depuisTexte(saisie))}>Aperçu</button>
          </div>
        )}

        {aAssocier && !apercu && (
          <div className="carte">
            <strong>Colonnes non reconnues</strong>
            <p className="doux">Indiquez où se trouvent le nom, le prénom et le numéro.</p>
            {([['nom', 'Colonne du nom'], ['prenom', 'Colonne du prénom'], ['numero', 'Colonne du numéro']] as const).map(([cle, libelle]) => (
              <label className="champ" key={cle}>
                <span>{libelle}</span>
                <select value={colonnes[cle]} onChange={(e) => setColonnes({ ...colonnes, [cle]: e.target.value })}>
                  <option value="">{cle === 'nom' ? 'Choisir…' : 'Aucune'}</option>
                  {optionsColonnes}
                </select>
              </label>
            ))}
            <button type="button" className="bouton primaire" onClick={associer}>Aperçu</button>
          </div>
        )}

        {occupe && <p className="info" role="status">{occupe}</p>}
        {erreur && <p className="erreur" role="alert">{erreur}</p>}

        {apercu && (
          <>
            {nombre === 0 && <p className="vide">Aucun élève trouvé.</p>}
            {apercu.length > 0 && (
              <table className="tableau">
                <thead><tr><th>N°</th><th>Nom</th><th>Prénom</th><th /></tr></thead>
                <tbody>
                  {apercu.map((e, i) => (
                    <tr key={i}>
                      <td className="etroit"><input type="number" aria-label="Numéro" value={e.numero} onChange={(x) => changer(i, 'numero', x.target.value)} /></td>
                      <td><input aria-label="Nom" value={e.nom} onChange={(x) => changer(i, 'nom', x.target.value)} /></td>
                      <td><input aria-label="Prénom" value={e.prenom} onChange={(x) => changer(i, 'prenom', x.target.value)} /></td>
                      <td className="action"><button type="button" aria-label="Retirer la ligne" onClick={() => setApercu(apercu.filter((_, j) => j !== i))}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="rangee">
              <button type="button" className="bouton" onClick={() => setApercu(null)}>Recommencer</button>
              <button type="button" className="bouton primaire etire" disabled={!nombre} onClick={importer}>
                Importer {nombre} élève{nombre > 1 ? 's' : ''}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

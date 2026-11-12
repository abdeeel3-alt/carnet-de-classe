import { useState, type FormEvent } from 'react';
import Feuille from '../composants/Feuille';
import { chevauche, JOURS } from '../domaine/emploiDuTemps';
import type { Classe, Creneau } from '../domaine/types';
import { enregistrer, supprimer } from '../stockage/depot';

/** Heures proposées : de 08:00 à 19:00 par pas de 30 minutes. */
const HEURES = Array.from({ length: 23 }, (_, i) => `${String(8 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);

interface Props { creneau: Creneau | null; jourInitial: Creneau['jour']; classes: Classe[]; creneaux: Creneau[]; onFermer: () => void }

export default function CreneauFormulaire({ creneau, jourInitial, classes, creneaux, onFermer }: Props) {
  const [jour, setJour] = useState<Creneau['jour']>(creneau?.jour ?? jourInitial);
  const [debut, setDebut] = useState(creneau?.debut ?? '08:00');
  const [fin, setFin] = useState(creneau?.fin ?? '09:00');
  const [classeId, setClasseId] = useState(creneau?.classe_id ?? classes[0]?.id ?? '');
  const [salle, setSalle] = useState(creneau?.salle ?? '');
  const [erreur, setErreur] = useState('');

  const probleme = (j: Creneau['jour']): string => {
    if (!classeId) return 'Choisissez une classe';
    if (fin <= debut) return 'La fin doit être après le début';
    if (creneaux.some((c) => c.id !== creneau?.id && chevauche(c, { jour: j, debut, fin }))) return 'Ce créneau chevauche un autre créneau';
    return '';
  };

  async function valider(e: FormEvent) {
    e.preventDefault();
    const p = probleme(jour);
    if (p) { setErreur(p); return; }
    await enregistrer<Creneau>('creneaux', { ...(creneau ?? {}), jour, debut, fin, classe_id: classeId, salle: salle.trim() });
    onFermer();
  }

  async function dupliquer(vers: Creneau['jour']) {
    const autres = creneaux.some((c) => chevauche(c, { jour: vers, debut, fin }));
    if (fin <= debut || autres) { setErreur(fin <= debut ? 'La fin doit être après le début' : 'Ce créneau chevauche un autre créneau'); return; }
    await enregistrer<Creneau>('creneaux', { jour: vers, debut, fin, classe_id: classeId, salle: salle.trim() });
    onFermer();
  }

  return (
    <Feuille titre={creneau ? 'Modifier le créneau' : 'Nouveau créneau'} onFermer={onFermer}>
      <form onSubmit={valider} className="carte" style={{ border: 0, padding: 0 }}>
        <div className="champ"><span>Jour</span>
          <div className="options">
            {JOURS.map((j) => <button key={j.jour} type="button" aria-pressed={jour === j.jour} onClick={() => setJour(j.jour)}>{j.court}</button>)}
          </div>
        </div>
        <div className="rangee">
          <label className="champ etire"><span>Début</span>
            <select value={debut} onChange={(e) => setDebut(e.target.value)}>{HEURES.map((h) => <option key={h}>{h}</option>)}</select>
          </label>
          <label className="champ etire"><span>Fin</span>
            <select value={fin} onChange={(e) => setFin(e.target.value)}>{HEURES.map((h) => <option key={h}>{h}</option>)}</select>
          </label>
        </div>
        <label className="champ"><span>Classe</span>
          <select value={classeId} onChange={(e) => setClasseId(e.target.value)}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </label>
        <label className="champ"><span>Salle</span>
          <input value={salle} onChange={(e) => setSalle(e.target.value)} placeholder="Facultative" />
        </label>
        {erreur && <p className="erreur" role="alert">{erreur}</p>}
        <button className="bouton primaire large">Enregistrer</button>
        {creneau && (
          <>
            <label className="champ"><span>Dupliquer vers un autre jour</span>
              <select value="" onChange={(e) => e.target.value && dupliquer(Number(e.target.value) as Creneau['jour'])}>
                <option value="">Choisir un jour…</option>
                {JOURS.filter((j) => j.jour !== creneau.jour).map((j) => <option key={j.jour} value={j.jour}>{j.nom}</option>)}
              </select>
            </label>
            <button type="button" className="bouton danger" onClick={async () => { await supprimer('creneaux', creneau.id); onFermer(); }}>Supprimer le créneau</button>
          </>
        )}
      </form>
    </Feuille>
  );
}

import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import EnTete from '../../composants/EnTete';
import Feuille from '../../composants/Feuille';
import type { Classe, Eleve } from '../../domaine/types';
import { enregistrer } from '../../stockage/depot';
import { useListe } from '../../stockage/hooks';

export function anneeScolaireCourante(d = new Date()): string {
  const a = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
  return `${a}-${a + 1}`;
}

export default function Classes() {
  const classes = useListe<Classe>('classes');
  const eleves = useListe<Eleve>('eleves');
  const [ajout, setAjout] = useState(false);
  const [nom, setNom] = useState('');
  const [niveau, setNiveau] = useState<Classe['niveau']>('3AC');
  const [annee, setAnnee] = useState(anneeScolaireCourante());

  async function creer(e: FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;
    await enregistrer<Classe>('classes', { nom: nom.trim(), niveau, annee: annee.trim(), archivee: false, plan_rangees: 5, plan_colonnes: 6 });
    setNom(''); setAjout(false);
  }

  const triees = [...(classes ?? [])].sort((a, b) => Number(a.archivee) - Number(b.archivee) || a.nom.localeCompare(b.nom, 'fr', { numeric: true }));
  const effectif = (id: string) => (eleves ?? []).filter((e) => e.classe_id === id).length;

  return (
    <>
      <EnTete titre="Classes et élèves" retour="/reglages" />
      <div className="contenu">
        {classes && !triees.length && <p className="vide">Aucune classe. Créez votre première classe.</p>}
        {triees.length > 0 && (
          <ul className="liste">
            {triees.map((c) => (
              <li key={c.id}>
                <Link className="ligne" to={`/reglages/classes/${c.id}`}>
                  <span className="principal">
                    <strong>{c.nom}{c.archivee ? ' (archivée)' : ''}</strong>
                    <span className="doux">{c.niveau} · {c.annee} · {effectif(c.id)} élève{effectif(c.id) > 1 ? 's' : ''}</span>
                  </span>
                  <span className="chevron" aria-hidden="true">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="bouton primaire" onClick={() => setAjout(true)}>+ Nouvelle classe</button>
      </div>
      {ajout && (
        <Feuille titre="Nouvelle classe" onFermer={() => setAjout(false)}>
          <form onSubmit={creer} className="carte" style={{ border: 0, padding: 0 }}>
            <label className="champ"><span>Nom de la classe</span>
              <input autoFocus required value={nom} onChange={(e) => setNom(e.target.value)} placeholder="3AC-2" />
            </label>
            <div className="champ"><span>Niveau</span>
              <div className="options">
                {(['2AC', '3AC'] as const).map((n) => (
                  <button key={n} type="button" aria-pressed={niveau === n} onClick={() => setNiveau(n)}>{n}</button>
                ))}
              </div>
            </div>
            <label className="champ"><span>Année scolaire</span>
              <input required value={annee} onChange={(e) => setAnnee(e.target.value)} />
            </label>
            <button className="bouton primaire large">Créer la classe</button>
          </form>
        </Feuille>
      )}
    </>
  );
}

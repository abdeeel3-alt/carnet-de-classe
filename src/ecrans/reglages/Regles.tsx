import { useState, type FormEvent } from 'react';
import EnTete from '../../composants/EnTete';
import Feuille from '../../composants/Feuille';
import { decrireRegle, seuilSigne } from '../../domaine/regles';
import { CRITERES, NOM_CRITERE, type Cible, type PeriodeRegle, type Regle } from '../../domaine/types';
import { enregistrer, supprimer } from '../../stockage/depot';
import { useListe } from '../../stockage/hooks';

const CIBLES: { valeur: Cible; nom: string }[] = [
  ...CRITERES.map((c) => ({ valeur: c as Cible, nom: `Points de ${NOM_CRITERE[c]}` })),
  { valeur: 'total', nom: 'Total général des points' },
  { valeur: 'absences', nom: 'Nombre d’absences' },
  { valeur: 'retards', nom: 'Nombre de retards' },
];
const PERIODES: { valeur: PeriodeRegle; nom: string }[] = [
  { valeur: 'semaine', nom: 'Par semaine' }, { valeur: 'mois', nom: 'Par mois' }, { valeur: 'semestre', nom: 'Par semestre' },
];
type Brouillon = { id?: string; nom: string; type: Regle['type']; cible: Cible; seuil: string; periode: PeriodeRegle };

/** Règles qui proposent un badge ou une sanction quand un seuil est atteint. */
export default function Regles() {
  const regles = useListe<Regle>('regles');
  const [b, setB] = useState<Brouillon | null>(null);

  async function valider(e: FormEvent) {
    e.preventDefault();
    if (!b || !b.nom.trim() || !Number(b.seuil)) return;
    await enregistrer<Regle>('regles', {
      ...(b.id ? { id: b.id } : {}), nom: b.nom.trim(), type: b.type, cible: b.cible,
      seuil: seuilSigne(b.type, b.cible, Number(b.seuil)), periode: b.periode,
    });
    setB(null);
  }

  const triees = [...(regles ?? [])].sort((x, y) => x.type.localeCompare(y.type) || x.nom.localeCompare(y.nom, 'fr'));
  return (
    <>
      <EnTete titre="Badges et sanctions" retour="/reglages" />
      <div className="contenu">
        <p className="doux">Quand un seuil est atteint, l’application vous propose le badge ou la sanction en fin de séance. Vous validez ou refusez.</p>
        {regles && !triees.length && <p className="vide">Aucune règle.</p>}
        {triees.length > 0 && (
          <ul className="liste">
            {triees.map((r) => (
              <li key={r.id}>
                <button type="button" className="ligne" onClick={() => setB({ id: r.id, nom: r.nom, type: r.type, cible: r.cible, seuil: String(Math.abs(r.seuil)), periode: r.periode })}>
                  <span className={`etiquette ${r.type}`}>{r.type === 'badge' ? '★' : '⚠'}</span>
                  <span className="principal"><strong>{r.nom}</strong><span className="doux">{decrireRegle(r)}</span></span>
                  <span className="chevron" aria-hidden="true">›</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="bouton primaire" onClick={() => setB({ nom: '', type: 'badge', cible: 'participation', seuil: '10', periode: 'mois' })}>+ Nouvelle règle</button>
      </div>

      {b && (
        <Feuille titre={b.id ? 'Modifier la règle' : 'Nouvelle règle'} onFermer={() => setB(null)}>
          <form onSubmit={valider} className="carte" style={{ border: 0, padding: 0 }}>
            <label className="champ"><span>Nom</span>
              <input required value={b.nom} onChange={(e) => setB({ ...b, nom: e.target.value })} />
            </label>
            <div className="options">
              <button type="button" aria-pressed={b.type === 'badge'} onClick={() => setB({ ...b, type: 'badge' })}>Badge</button>
              <button type="button" aria-pressed={b.type === 'sanction'} onClick={() => setB({ ...b, type: 'sanction' })}>Sanction</button>
            </div>
            <label className="champ"><span>Porte sur</span>
              <select value={b.cible} onChange={(e) => setB({ ...b, cible: e.target.value as Cible })}>
                {CIBLES.map((c) => <option key={c.valeur} value={c.valeur}>{c.nom}</option>)}
              </select>
            </label>
            <label className="champ"><span>Seuil</span>
              <input type="number" min={1} inputMode="numeric" required value={b.seuil} onChange={(e) => setB({ ...b, seuil: e.target.value })} />
            </label>
            <label className="champ"><span>Période</span>
              <select value={b.periode} onChange={(e) => setB({ ...b, periode: e.target.value as PeriodeRegle })}>
                {PERIODES.map((p) => <option key={p.valeur} value={p.valeur}>{p.nom}</option>)}
              </select>
            </label>
            {Number(b.seuil) > 0 && (
              <p className="info">Proposé à : {decrireRegle({ ...b, seuil: seuilSigne(b.type, b.cible, Number(b.seuil)) } as unknown as Regle)}</p>
            )}
            <button className="bouton primaire large">Enregistrer</button>
            {b.id && <button type="button" className="bouton danger" onClick={async () => { await supprimer('regles', b.id!); setB(null); }}>Supprimer la règle</button>}
          </form>
        </Feuille>
      )}
    </>
  );
}

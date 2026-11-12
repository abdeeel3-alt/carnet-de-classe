import { signe } from '../../domaine/texte';
import { CRITERES, NOM_CRITERE, type Critere, type Observation } from '../../domaine/types';

export interface Marques { absent: boolean; retard: boolean; parCritere: Map<Critere, number>; total: number }

/** Ce qu'il faut afficher pour un élève dans la séance : présence, points par critère, total. */
export function marques(observations: Observation[]): Marques {
  const m: Marques = { absent: false, retard: false, parCritere: new Map(), total: 0 };
  for (const o of observations) {
    if (o.code === 'absent') m.absent = true;
    if (o.code === 'retard') m.retard = true;
    m.total += o.points;
    if (!o.code || o.points) m.parCritere.set(o.critere, (m.parCritere.get(o.critere) ?? 0) + o.points);
  }
  return m;
}

export function parEleve(observations: Observation[]): Map<string, Observation[]> {
  const carte = new Map<string, Observation[]>();
  for (const o of observations) carte.set(o.eleve_id, [...(carte.get(o.eleve_id) ?? []), o]);
  return carte;
}

export function Pastilles({ m }: { m: Marques }) {
  return (
    <span className="pastilles">
      {m.absent && <span className="pastille discipline" aria-label="Absent">A</span>}
      {m.retard && <span className="pastille" style={{ background: 'var(--alerte)' }} aria-label="Retard">R</span>}
      {CRITERES.filter((c) => m.parCritere.has(c)).map((c) => (
        <span key={c} className={`pastille ${c}`} aria-label={`${NOM_CRITERE[c]} ${signe(m.parCritere.get(c)!)}`}>{signe(m.parCritere.get(c)!)}</span>
      ))}
    </span>
  );
}

export const classePresence = (m: Marques) => (m.absent ? 'absent' : m.retard ? 'retard' : '');

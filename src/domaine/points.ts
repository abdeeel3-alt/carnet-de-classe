import { dansIntervalle, type Intervalle } from './periodes';
import type { Critere, Observation } from './types';

export interface Totaux { parCritere: Record<Critere, number>; total: number; absences: number; retards: number }

export function totauxVides(): Totaux {
  return { parCritere: { presence: 0, reglement: 0, participation: 0, discipline: 0, serieux: 0 }, total: 0, absences: 0, retards: 0 };
}

/** Totaux par élève (clé : eleve_id), recalculés depuis les observations non supprimées de l'intervalle. */
export function calculerTotaux(observations: Observation[], intervalle?: Intervalle): Map<string, Totaux> {
  const resultat = new Map<string, Totaux>();
  for (const o of observations) {
    if (o.deleted) continue;
    if (intervalle && !dansIntervalle(o.horodatage, intervalle)) continue;
    let t = resultat.get(o.eleve_id);
    if (!t) resultat.set(o.eleve_id, (t = totauxVides()));
    t.parCritere[o.critere] += o.points;
    t.total += o.points;
    if (o.code === 'absent') t.absences += 1;
    if (o.code === 'retard') t.retards += 1;
  }
  return resultat;
}

import { clePeriode, intervalleRegle } from './periodes';
import { calculerTotaux, type Totaux } from './points';
import type { Attribution, Observation, Parametres, Regle } from './types';

export interface Proposition { eleve_id: string; regle_id: string; libelle: string; type: 'badge' | 'sanction'; cle_periode: string }

function valeur(regle: Regle, t: Totaux): number {
  switch (regle.cible) {
    case 'total': return t.total;
    case 'absences': return t.absences;
    case 'retards': return t.retards;
    default: return t.parCritere[regle.cible];
  }
}

/** Un seuil négatif est atteint quand la valeur descend jusqu'à lui ; un seuil positif quand elle monte jusqu'à lui. */
export function atteint(regle: Regle, t: Totaux): boolean {
  const v = valeur(regle, t);
  return regle.seuil < 0 ? v <= regle.seuil : v >= regle.seuil;
}

/** Badges et sanctions à proposer à la date donnée, hors ceux déjà proposés, validés ou refusés pour la même période. */
export function proposer(regles: Regle[], observations: Observation[], existantes: Attribution[], date: Date, p: Parametres): Proposition[] {
  const deja = new Set(
    existantes.filter((a) => !a.deleted && a.regle_id).map((a) => `${a.eleve_id}|${a.regle_id}|${a.cle_periode}`),
  );
  const propositions: Proposition[] = [];
  for (const regle of regles) {
    if (regle.deleted) continue;
    const cle = clePeriode(regle.periode, date, p);
    const totaux = calculerTotaux(observations, intervalleRegle(regle.periode, date, p));
    for (const [eleve_id, t] of totaux) {
      if (!atteint(regle, t)) continue;
      if (deja.has(`${eleve_id}|${regle.id}|${cle}`)) continue;
      propositions.push({ eleve_id, regle_id: regle.id, libelle: regle.nom, type: regle.type, cle_periode: cle });
    }
  }
  return propositions;
}

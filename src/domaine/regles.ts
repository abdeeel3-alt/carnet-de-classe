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

const CRITERES_REGLE = ['presence', 'reglement', 'participation', 'discipline', 'serieux', 'total'];

/** Signe du seuil d'après la règle : négatif pour une sanction sur des points, positif sinon. */
export function seuilSigne(type: Regle['type'], cible: Regle['cible'], valeur: number): number {
  const v = Math.abs(Math.round(valeur));
  return type === 'sanction' && CRITERES_REGLE.includes(cible) ? -v : v;
}

const NOM_CIBLE: Record<Regle['cible'], string> = {
  presence: 'en Présence', reglement: 'en Règlement', participation: 'en Participation', discipline: 'en Discipline',
  serieux: 'en Sérieux', total: 'au total', absences: 'absence', retards: 'retard',
};
const NOM_PERIODE: Record<Regle['periode'], string> = { semaine: 'sur la semaine', mois: 'sur le mois', semestre: 'sur le semestre' };

/** « −5 en Discipline sur le mois », « 3 retards sur le mois ». */
export function decrireRegle(r: Regle): string {
  if (r.cible === 'absences' || r.cible === 'retards') return `${r.seuil} ${NOM_CIBLE[r.cible]}${r.seuil > 1 ? 's' : ''} ${NOM_PERIODE[r.periode]}`;
  const seuil = r.seuil > 0 ? `+${r.seuil}` : r.seuil < 0 ? `−${Math.abs(r.seuil)}` : '0';
  return `${seuil} ${NOM_CIBLE[r.cible]} ${NOM_PERIODE[r.periode]}`;
}

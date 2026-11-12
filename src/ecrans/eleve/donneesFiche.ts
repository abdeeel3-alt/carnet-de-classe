import { dansIntervalle, resoudrePeriode, type ChoixPeriode, type Intervalle } from '../../domaine/periodes';
import { calculerTotaux, totauxVides, type Totaux } from '../../domaine/points';
import type { Attribution, Classe, Eleve, Observation } from '../../domaine/types';
import { lireParametres, lister, obtenir } from '../../stockage/depot';

export interface DonneesFiche {
  eleve: Eleve; classe: Classe; intervalle: Intervalle; totaux: Totaux;
  absences: Observation[]; retards: Observation[];
  /** De la plus récente à la plus ancienne. */
  observations: Observation[];
  /** Badges et sanctions validés pendant la période. */
  attributions: Attribution[];
}

/** Tout ce que montre la fiche d'un élève sur la période choisie. `null` si l'élève n'existe pas. */
export async function donneesFiche(eleveId: string, choix: ChoixPeriode, aujourdHui: Date): Promise<DonneesFiche | null> {
  const eleve = await obtenir<Eleve>('eleves', eleveId);
  if (!eleve) return null;
  const classe = (await obtenir<Classe>('classes', eleve.classe_id)) ?? ({ id: eleve.classe_id, nom: '—' } as Classe);
  const intervalle = resoudrePeriode(choix, aujourdHui, await lireParametres());
  const observations = (await lister<Observation>('observations', { eleve_id: eleveId }))
    .filter((o) => dansIntervalle(o.horodatage, intervalle))
    .sort((a, b) => b.horodatage.localeCompare(a.horodatage));
  const attributions = (await lister<Attribution>('attributions', { eleve_id: eleveId }))
    .filter((a) => a.etat === 'validee' && dansIntervalle(a.date, intervalle))
    .sort((a, b) => b.date.localeCompare(a.date));
  return {
    eleve, classe, intervalle, observations, attributions,
    totaux: calculerTotaux(observations).get(eleveId) ?? totauxVides(),
    absences: observations.filter((o) => o.code === 'absent'),
    retards: observations.filter((o) => o.code === 'retard'),
  };
}

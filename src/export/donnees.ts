import type ExcelJS from 'exceljs';
import { dansIntervalle, libellePeriode, resoudrePeriode, versIsoJour, type ChoixPeriode } from '../domaine/periodes';
import { calculerTotaux } from '../domaine/points';
import { TABLES, type Attribution, type Classe, type Creneau, type Eleve, type NomTable, type Observation, type Seance } from '../domaine/types';
import { donneesFiche } from '../ecrans/eleve/donneesFiche';
import { base } from '../stockage/base';
import { lireParametres, lister, obtenir } from '../stockage/depot';
import { bilanComportement, emploiDuTemps, ficheEleve, listeDeClasse, registrePresence, sauvegardeComplete, type EnTeteDoc } from './classeurs';

import type { SorteExport } from './liste';

export { EXPORTS, type SorteExport } from './liste';

const pourNom = (s: string) => s.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');

/** Rassemble les données et construit le classeur demandé, avec son nom de fichier. */
export async function preparerExport(
  sorte: SorteExport, options: { classeId?: string; eleveId?: string; choix: ChoixPeriode }, aujourdHui: Date,
): Promise<{ classeur: ExcelJS.Workbook; nomFichier: string }> {
  const p = await lireParametres();
  const intervalle = resoudrePeriode(options.choix, aujourdHui, p);
  const bornes = `${versIsoJour(intervalle.debut)}_${versIsoJour(intervalle.fin)}`;
  const enTete = (classe: Classe | undefined, avecPeriode: boolean): EnTeteDoc => ({
    etablissement: p.etablissement, professeur: p.professeur, matiere: p.matiere,
    classe: classe?.nom ?? '', annee: classe?.annee ?? '', periode: avecPeriode ? libellePeriode(intervalle) : '', titre: '',
  });

  if (sorte === 'sauvegarde') {
    const tables = {} as Record<NomTable, object[]>;
    for (const t of TABLES) tables[t] = await base[t].toArray();
    return { classeur: sauvegardeComplete(tables), nomFichier: `sauvegarde_${versIsoJour(aujourdHui)}.xlsx` };
  }
  if (sorte === 'emploi') {
    const classes = await lister<Classe>('classes');
    const annee = classes.find((c) => !c.archivee)?.annee ?? '';
    return { classeur: emploiDuTemps({ ...enTete(undefined, false), annee }, await lister<Creneau>('creneaux'), classes), nomFichier: 'emploi-du-temps.xlsx' };
  }

  const classe = options.classeId ? await obtenir<Classe>('classes', options.classeId) : undefined;
  if (!classe) throw new Error('Choisissez une classe');
  const eleves = await lister<Eleve>('eleves', { classe_id: classe.id });
  const nomClasse = pourNom(classe.nom);

  if (sorte === 'liste') return { classeur: listeDeClasse(enTete(classe, false), eleves), nomFichier: `liste_${nomClasse}.xlsx` };

  if (sorte === 'fiche') {
    const d = options.eleveId ? await donneesFiche(options.eleveId, options.choix, aujourdHui) : null;
    if (!d) throw new Error('Choisissez un élève');
    return { classeur: ficheEleve(enTete(classe, true), d), nomFichier: `fiche_${pourNom(`${d.eleve.nom} ${d.eleve.prenom}`)}_${bornes}.xlsx` };
  }

  const observations: Observation[] = [];
  const attributions: Attribution[] = [];
  for (const e of eleves) {
    observations.push(...(await lister<Observation>('observations', { eleve_id: e.id })).filter((o) => dansIntervalle(o.horodatage, intervalle)));
    attributions.push(...(await lister<Attribution>('attributions', { eleve_id: e.id })).filter((a) => dansIntervalle(a.date, intervalle)));
  }
  if (sorte === 'presence') {
    const seances = (await lister<Seance>('seances', { classe_id: classe.id })).filter((s) => dansIntervalle(s.debut, intervalle));
    return { classeur: registrePresence(enTete(classe, true), eleves, seances, observations), nomFichier: `presence_${nomClasse}_${bornes}.xlsx` };
  }
  return { classeur: bilanComportement(enTete(classe, true), eleves, calculerTotaux(observations), attributions), nomFichier: `bilan_${nomClasse}_${bornes}.xlsx` };
}

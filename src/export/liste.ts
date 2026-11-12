/** La liste des exports proposés. Fichier léger : il ne charge pas le moteur Excel. */
export type SorteExport = 'liste' | 'presence' | 'bilan' | 'fiche' | 'emploi' | 'sauvegarde';
export const EXPORTS: { sorte: SorteExport; nom: string; detail: string; classe: boolean; periode: boolean; eleve: boolean }[] = [
  { sorte: 'liste', nom: 'Liste de classe', detail: 'Numéro, nom, prénom et colonnes vides', classe: true, periode: false, eleve: false },
  { sorte: 'presence', nom: 'Registre de présence', detail: 'Absences et retards par séance', classe: true, periode: true, eleve: false },
  { sorte: 'bilan', nom: 'Bilan de comportement', detail: 'Points par critère, badges, sanctions', classe: true, periode: true, eleve: false },
  { sorte: 'fiche', nom: 'Fiche élève', detail: 'Le détail d’un élève sur la période', classe: true, periode: true, eleve: true },
  { sorte: 'emploi', nom: 'Emploi du temps', detail: 'La grille de la semaine', classe: false, periode: false, eleve: false },
  { sorte: 'sauvegarde', nom: 'Sauvegarde complète', detail: 'Toutes les données, pour archivage', classe: false, periode: false, eleve: false },
];

export type Critere = 'presence' | 'reglement' | 'participation' | 'discipline' | 'serieux';
export const CRITERES: Critere[] = ['presence', 'reglement', 'participation', 'discipline', 'serieux'];
export const NOM_CRITERE: Record<Critere, string> = {
  presence: 'Présence',
  reglement: 'Règlement',
  participation: 'Participation',
  discipline: 'Discipline',
  serieux: 'Sérieux',
};

export interface Base { id: string; updated_at: string; deleted: boolean }
export interface Classe extends Base { nom: string; niveau: '2AC' | '3AC'; annee: string; archivee: boolean; plan_rangees: number; plan_colonnes: number }
export interface Eleve extends Base { classe_id: string; numero: number; nom: string; prenom: string; rangee: number | null; colonne: number | null; remarques: string }
/** Heures au format 'HH:MM'. */
export interface Creneau extends Base { jour: 1 | 2 | 3 | 4 | 5 | 6; debut: string; fin: string; classe_id: string; salle: string }
export interface Seance extends Base { classe_id: string; creneau_id: string | null; debut: string; terminee: boolean }
export interface TypeObservation extends Base { critere: Critere; libelle: string; points: number; ordre: number; masque: boolean; synonymes: string[]; code: 'absent' | 'retard' | null }
export interface Observation extends Base { seance_id: string; eleve_id: string; type_id: string; critere: Critere; code: 'absent' | 'retard' | null; libelle: string; points: number; horodatage: string }
export type Cible = Critere | 'total' | 'absences' | 'retards';
export type PeriodeRegle = 'semaine' | 'mois' | 'semestre';
export interface Regle extends Base { nom: string; type: 'badge' | 'sanction'; cible: Cible; seuil: number; periode: PeriodeRegle }
export interface Attribution extends Base { eleve_id: string; regle_id: string | null; libelle: string; type: 'badge' | 'sanction'; date: string; etat: 'proposee' | 'validee' | 'refusee'; cle_periode: string }
/** Ligne unique d'id 'parametres' ; dates au format 'AAAA-MM-JJ'. */
export interface Parametres extends Base { semestre1_debut: string; semestre1_fin: string; semestre2_debut: string; semestre2_fin: string; etablissement: string; professeur: string; matiere: string }
export type NomTable = 'classes' | 'eleves' | 'creneaux' | 'seances' | 'types_observation' | 'observations' | 'regles' | 'attributions' | 'parametres';
export const TABLES: NomTable[] = ['classes', 'eleves', 'creneaux', 'seances', 'types_observation', 'observations', 'regles', 'attributions', 'parametres'];

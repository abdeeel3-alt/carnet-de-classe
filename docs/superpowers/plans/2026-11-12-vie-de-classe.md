# Carnet de classe — Module 1 (Vie de classe) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer une application web installable qui permet au professeur de suivre présence, comportement, points, badges et sanctions de ses classes au doigt ou à la voix, avec synchronisation entre appareils et exports Excel A4.

**Architecture:** Application React locale d'abord : toute écriture va dans IndexedDB, l'écran se met à jour aussitôt, une file d'attente pousse les changements vers Supabase. La logique métier (points, règles, périodes, emploi du temps, voix, import, export) vit dans des fonctions pures sans dépendance à l'écran ni au réseau ; les écrans ne font qu'afficher et appeler.

**Tech Stack:** Vite, React 18, TypeScript strict, react-router, Dexie + dexie-react-hooks, @supabase/supabase-js, vite-plugin-pwa, ExcelJS (écriture), xlsx (lecture), tesseract.js, @dnd-kit/core, Vitest + fake-indexeddb + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-12-vie-de-classe-design.md`

## Global Constraints

- Interface entièrement en français. Identifiants de code en français, sans accents.
- Un seul utilisateur par compte ; toutes les tables Supabase portent `user_id` et une politique RLS `user_id = auth.uid()`.
- Aucune attente à l'écran : toute action écrit en local puis synchronise en arrière-plan.
- Les totaux de points ne sont jamais stockés ; ils sont recalculés depuis les observations.
- Les points sont copiés dans l'observation au moment de la saisie.
- Les observations ne sont jamais modifiées : ajoutées ou marquées `deleted`.
- Tout ce qui se fait à la voix se fait aussi au doigt.
- Cibles tactiles d'au moins 48 px ; écran de référence 360 × 800.
- Sans `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`, l'application démarre en **mode local** (pas de connexion, pas de synchronisation). Les tests et le développement utilisent ce mode.
- La semaine commence le lundi. Les dates sont manipulées en heure locale de l'appareil.
- Niveaux possibles : `2AC`, `3AC`. Jours de l'emploi du temps : lundi (1) à samedi (6).
- Exports : A4, ajustés à une page en largeur, titres répétés, en couleurs, chaque information colorée aussi écrite en clair.
- Chaque commit se termine par les lignes d'attribution de la session.

## Review Focus

1. **Fichier Excel de Massar avec un bloc d'en-tête** (lignes de titre, cellules fusionnées, lignes vides avant le tableau) : la ligne d'en-têtes doit être trouvée où qu'elle soit. Test en tâche 6.
2. **Nombres dictés en lettres ou collés** (« numéro douze », « n° 12 », « 4, 17 et 23 ») et prénoms mal transcrits (« Selma » pour « Salma ») : l'élève doit être trouvé ou proposé, jamais un autre appliqué en silence. Test en tâche 7.
3. **Seuils négatifs des sanctions** : −5 signifie « total inférieur ou égal à −5 » ; un élève à −4 ne doit rien recevoir, et une proposition refusée ne revient pas dans la même période. Test en tâche 4.
4. **Double appui sur « Démarrer »** ou reprise dans les 2 heures : une seule séance doit exister. Test en tâche 8.
5. **Rechargement de la page hors ligne avec des changements en attente** : rien ne doit être perdu, l'envoi reprend au retour du réseau. Test en tâche 9.

---

## Structure des fichiers

```
src/
  domaine/
    types.ts            types de toutes les données
    catalogue.ts        observations et règles de départ
    periodes.ts         choix de période -> dates
    points.ts           totaux par élève
    regles.ts           propositions de badges et sanctions
    emploiDuTemps.ts    séance en cours, séances du jour
    texte.ts            normalisation et distance entre mots
  voix/
    interpreteur.ts     texte dicté -> actions
    ecoute.ts           enveloppe de la Web Speech API
  import/
    tableau.ts          lignes de tableur -> élèves
    texte.ts            texte libre ou lu sur photo -> élèves
    fichiers.ts         lecture xlsx/csv et OCR (non pur)
  export/
    styles.ts           couleurs et styles communs
    classeurs.ts        construction des six exports
    telecharger.ts      déclenche le téléchargement
  stockage/
    base.ts             schéma Dexie
    depot.ts            lectures et écritures, file d'attente
    seances.ts          ouverture ou reprise d'une séance
    synchro.ts          pousser et tirer
    distant.ts          interface Distant + adaptateur Supabase
  ecrans/               un dossier par écran
  composants/           boutons, panneaux, bandeau, sélecteur de période
  App.tsx, main.tsx, styles.css
supabase/migrations/0001_init.sql
e2e/parcours.spec.ts
```

---

### Task 1 : Socle du projet, types et catalogue de départ

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `public/manifest.webmanifest`, `public/icone-192.png`, `public/icone-512.png`, `.gitignore`, `.env.example`
- Create: `src/domaine/types.ts`, `src/domaine/catalogue.ts`
- Test: `src/domaine/catalogue.test.ts`

**Interfaces:**
- Produces (`src/domaine/types.ts`) :

```ts
export type Critere = 'presence' | 'reglement' | 'participation' | 'discipline' | 'serieux';
export interface Base { id: string; updated_at: string; deleted: boolean }
export interface Classe extends Base { nom: string; niveau: '2AC' | '3AC'; annee: string; archivee: boolean; plan_rangees: number; plan_colonnes: number }
export interface Eleve extends Base { classe_id: string; numero: number; nom: string; prenom: string; rangee: number | null; colonne: number | null; remarques: string }
export interface Creneau extends Base { jour: 1|2|3|4|5|6; debut: string; fin: string; classe_id: string; salle: string } // 'HH:MM'
export interface Seance extends Base { classe_id: string; creneau_id: string | null; debut: string; terminee: boolean }
export interface TypeObservation extends Base { critere: Critere; libelle: string; points: number; ordre: number; masque: boolean; synonymes: string[]; code: 'absent' | 'retard' | null }
export interface Observation extends Base { seance_id: string; eleve_id: string; type_id: string; critere: Critere; code: 'absent' | 'retard' | null; libelle: string; points: number; horodatage: string }
export type Cible = Critere | 'total' | 'absences' | 'retards';
export type PeriodeRegle = 'semaine' | 'mois' | 'semestre';
export interface Regle extends Base { nom: string; type: 'badge' | 'sanction'; cible: Cible; seuil: number; periode: PeriodeRegle }
export interface Attribution extends Base { eleve_id: string; regle_id: string | null; libelle: string; type: 'badge' | 'sanction'; date: string; etat: 'proposee' | 'validee' | 'refusee'; cle_periode: string }
export interface Parametres extends Base { semestre1_debut: string; semestre1_fin: string; semestre2_debut: string; semestre2_fin: string; etablissement: string; professeur: string; matiere: string } // id fixe 'parametres', dates 'AAAA-MM-JJ'
export type NomTable = 'classes' | 'eleves' | 'creneaux' | 'seances' | 'types_observation' | 'observations' | 'regles' | 'attributions' | 'parametres';
```

- Produces (`src/domaine/catalogue.ts`) : `typesDeDepart(): Omit<TypeObservation, keyof Base>[]` et `reglesDeDepart(): Omit<Regle, keyof Base>[]`.

- [ ] **Step 1 :** Créer le projet Vite React TypeScript à la racine, installer les dépendances du Tech Stack, configurer Vitest (environnement `jsdom`, `fake-indexeddb/auto` en fichier de setup) et `vite-plugin-pwa` (`registerType: 'autoUpdate'`, nom « Carnet de classe », `lang: 'fr'`, `display: 'standalone'`). Scripts : `dev`, `build`, `test` (`vitest run`), `e2e` (`playwright test`), `typecheck` (`tsc --noEmit`).
- [ ] **Step 2 :** Écrire `src/domaine/types.ts` exactement comme ci-dessus.
- [ ] **Step 3 :** Écrire le test qui échoue :

```ts
test('catalogue de départ conforme à la spec', () => {
  const t = typesDeDepart();
  expect(t).toHaveLength(14);
  const p = (l: string) => t.find(x => x.libelle === l)!;
  expect(p('Absent')).toMatchObject({ critere: 'presence', points: 0, code: 'absent' });
  expect(p('Retard')).toMatchObject({ critere: 'presence', points: 0, code: 'retard' });
  expect(p('Sans uniforme').points).toBe(-1);
  expect(p('Téléphone en classe').points).toBe(-2);
  expect(p('Excellente réponse').points).toBe(2);
  expect(p('Manque de respect').points).toBe(-3);
});
test('règles de départ conformes à la spec', () => {
  const r = reglesDeDepart();
  expect(r).toContainEqual({ nom: 'Participant actif', type: 'badge', cible: 'participation', seuil: 10, periode: 'mois' });
  expect(r).toContainEqual({ nom: 'Élève exemplaire', type: 'badge', cible: 'total', seuil: 20, periode: 'semestre' });
  expect(r).toContainEqual({ nom: 'Avertissement', type: 'sanction', cible: 'discipline', seuil: -5, periode: 'mois' });
  expect(r).toContainEqual({ nom: 'Convocation des parents', type: 'sanction', cible: 'discipline', seuil: -10, periode: 'semestre' });
  expect(r).toContainEqual({ nom: "Signalement à l'administration", type: 'sanction', cible: 'retards', seuil: 3, periode: 'mois' });
});
```

- [ ] **Step 4 :** `npm test` → échec attendu (fonctions absentes).
- [ ] **Step 5 :** Implémenter `catalogue.ts` avec les 14 observations de la section 4 de la spec (ordre de la table, `masque: false`) et les 5 règles. Synonymes : Absent `['absente','absents']`, Retard `['en retard','retardataire']`, Bonne participation `['participation plus','participe']`, Bavardage `['bavarde','discipline moins']`, Travail non fait `['devoir non fait','sérieux moins']`, Travail soigné `['sérieux plus']`, Sans uniforme `['sans tablier','pas d\'uniforme']` ; vide ailleurs.
- [ ] **Step 6 :** `npm test` et `npm run typecheck` → succès. `npm run build` → succès.
- [ ] **Step 7 :** Commit `chore: socle du projet, types et catalogue de départ`.

### Task 2 : Périodes

**Files:** Create `src/domaine/periodes.ts` · Test `src/domaine/periodes.test.ts`

**Interfaces:**
- Produces :

```ts
export type ChoixPeriode = { type: 'semaine' | 'mois' | 'semestre1' | 'semestre2' | 'annee' } | { type: 'dates'; debut: string; fin: string };
export interface Intervalle { debut: Date; fin: Date } // bornes incluses, debut à 00:00:00.000, fin à 23:59:59.999
export function resoudrePeriode(choix: ChoixPeriode, aujourdHui: Date, p: Parametres): Intervalle;
export function intervalleRegle(periode: PeriodeRegle, date: Date, p: Parametres): Intervalle;
export function clePeriode(periode: PeriodeRegle, date: Date, p: Parametres): string; // '2026-S46', '2026-11', 'semestre1' | 'semestre2'
export function dansIntervalle(iso: string, i: Intervalle): boolean;
```

- [ ] **Step 1 :** Tests (paramètres : S1 du 2026-09-07 au 2027-01-24, S2 du 2027-01-25 au 2027-06-30 ; aujourd'hui jeudi 12 novembre 2026) :

```ts
expect(resoudrePeriode({ type: 'semaine' }, jeudi, p)).toEqual({ debut: local(2026,11,9,0,0,0,0), fin: local(2026,11,15,23,59,59,999) });
expect(resoudrePeriode({ type: 'mois' }, jeudi, p).debut).toEqual(local(2026,11,1,0,0,0,0));
expect(resoudrePeriode({ type: 'annee' }, jeudi, p)).toEqual({ debut: local(2026,9,7,0,0,0,0), fin: local(2027,6,30,23,59,59,999) });
expect(resoudrePeriode({ type: 'dates', debut: '2026-10-01', fin: '2026-10-15' }, jeudi, p).fin).toEqual(local(2026,10,15,23,59,59,999));
expect(clePeriode('semaine', jeudi, p)).toBe('2026-S46');
expect(clePeriode('mois', jeudi, p)).toBe('2026-11');
expect(clePeriode('semestre', jeudi, p)).toBe('semestre1');
expect(dansIntervalle(local(2026,11,15,23,59,0,0).toISOString(), resoudrePeriode({ type: 'semaine' }, jeudi, p))).toBe(true);
expect(dansIntervalle(local(2026,11,16,0,0,0,0).toISOString(), resoudrePeriode({ type: 'semaine' }, jeudi, p))).toBe(false);
// dimanche : la semaine est celle du lundi précédent
expect(resoudrePeriode({ type: 'semaine' }, local(2026,11,15,10,0,0,0), p).debut).toEqual(local(2026,11,9,0,0,0,0));
```

- [ ] **Step 2 :** Lancer → échec. **Step 3 :** Implémenter. Numéro de semaine ISO. Une date hors des deux semestres est rattachée au semestre le plus proche. **Step 4 :** Lancer → succès. **Step 5 :** Commit `feat: périodes`.

### Task 3 : Points

**Files:** Create `src/domaine/points.ts` · Test `src/domaine/points.test.ts`

**Interfaces:**
- Consumes : `Intervalle`, `dansIntervalle` (tâche 2).
- Produces :

```ts
export interface Totaux { parCritere: Record<Critere, number>; total: number; absences: number; retards: number }
export function totauxVides(): Totaux;
export function calculerTotaux(observations: Observation[], intervalle?: Intervalle): Map<string, Totaux>; // clé : eleve_id
```

- [ ] **Step 1 :** Tests : trois observations pour l'élève `e1` (participation +1, participation +2, discipline −1), une absence et un retard à 0 point → `parCritere.participation 3`, `discipline -1`, `total 2`, `absences 1`, `retards 1` ; une observation `deleted: true` est ignorée ; une observation hors intervalle est ignorée ; un retard valant −1 point compte dans `parCritere.presence` et dans `retards` ; liste vide → `Map` vide.
- [ ] **Step 2 :** échec. **Step 3 :** Implémenter. **Step 4 :** succès. **Step 5 :** Commit `feat: calcul des points`.

### Task 4 : Règles, badges et sanctions

**Files:** Create `src/domaine/regles.ts` · Test `src/domaine/regles.test.ts`

**Interfaces:**
- Consumes : `calculerTotaux`, `intervalleRegle`, `clePeriode`.
- Produces :

```ts
export interface Proposition { eleve_id: string; regle_id: string; libelle: string; type: 'badge' | 'sanction'; cle_periode: string }
export function atteint(regle: Regle, t: Totaux): boolean;
export function proposer(regles: Regle[], observations: Observation[], existantes: Attribution[], date: Date, p: Parametres): Proposition[];
```

- [ ] **Step 1 :** Tests :

```ts
// atteint
expect(atteint(regle({ type: 'badge', cible: 'participation', seuil: 10 }), totaux({ participation: 10 }))).toBe(true);
expect(atteint(regle({ type: 'badge', cible: 'participation', seuil: 10 }), totaux({ participation: 9 }))).toBe(false);
expect(atteint(regle({ type: 'sanction', cible: 'discipline', seuil: -5 }), totaux({ discipline: -5 }))).toBe(true);
expect(atteint(regle({ type: 'sanction', cible: 'discipline', seuil: -5 }), totaux({ discipline: -4 }))).toBe(false);
expect(atteint(regle({ type: 'sanction', cible: 'retards', seuil: 3 }), { ...totauxVides(), retards: 3 })).toBe(true);
expect(atteint(regle({ type: 'badge', cible: 'total', seuil: 20 }), totaux({ participation: 15, serieux: 5 }))).toBe(true);
```

Puis pour `proposer` : un élève à −5 en discipline ce mois → une proposition `Avertissement` avec `cle_periode '2026-11'` ; la même situation avec une attribution existante (état `proposee`, `validee` ou `refusee`) pour ce couple élève, règle, `cle_periode` → aucune proposition ; les observations du mois précédent ne comptent pas pour une règle mensuelle ; règle `deleted` ignorée.

- [ ] **Step 2 :** échec. **Step 3 :** Implémenter. Sens du seuil : `seuil < 0` → valeur ≤ seuil ; sinon valeur ≥ seuil. **Step 4 :** succès. **Step 5 :** Commit `feat: règles de badges et sanctions`.

### Task 5 : Emploi du temps

**Files:** Create `src/domaine/emploiDuTemps.ts` · Test `src/domaine/emploiDuTemps.test.ts`

**Interfaces:**
- Produces :

```ts
export function seancesDuJour(creneaux: Creneau[], date: Date): Creneau[]; // triées par heure de début
export function creneauCourant(creneaux: Creneau[], maintenant: Date): { enCours: Creneau | null; prochain: Creneau | null };
export function chevauche(a: Pick<Creneau,'jour'|'debut'|'fin'>, b: Pick<Creneau,'jour'|'debut'|'fin'>): boolean;
```

- [ ] **Step 1 :** Tests, avec lundi 08:00–09:00 (c1), lundi 10:00–12:00 (c2), mardi 08:00–10:00 (c3) : lundi 08:30 → `enCours c1`, `prochain c2` ; lundi 09:30 → `enCours null`, `prochain c2` ; lundi 09:00 pile → `enCours null` (fin exclue) ; lundi 13:00 → `prochain null` (seulement le jour même) ; dimanche → tableau vide et deux `null` ; créneaux `deleted` ignorés ; `chevauche` vrai pour 08:00–09:00 et 08:30–09:30 le même jour, faux pour 08:00–09:00 et 09:00–10:00.
- [ ] **Step 2 :** échec. **Step 3 :** Implémenter. **Step 4 :** succès. **Step 5 :** Commit `feat: emploi du temps`.

### Task 6 : Import des listes (logique)

**Files:** Create `src/domaine/texte.ts`, `src/import/tableau.ts`, `src/import/texte.ts` · Test `src/import/import.test.ts`, `src/domaine/texte.test.ts`

**Interfaces:**
- Produces :

```ts
// domaine/texte.ts
export function normaliser(s: string): string; // minuscules, sans accents, sans ponctuation, espaces réduits
export function distance(a: string, b: string): number; // Levenshtein
// import
export interface EleveBrouillon { numero: number; nom: string; prenom: string }
export interface Correspondance { ligneEntetes: number; numero: number | null; nom: number | null; prenom: number | null; nomComplet: number | null }
export function detecterColonnes(lignes: string[][]): Correspondance | null;
export function depuisTableau(lignes: string[][], c: Correspondance): EleveBrouillon[];
export function depuisTexte(texte: string): EleveBrouillon[];
```

- [ ] **Step 1 :** Tests :

```ts
expect(normaliser('  Éléve-N°12 ')).toBe('eleve n 12');
expect(distance('salma', 'selma')).toBe(1);

// en-têtes reconnus : N°/Numéro/Num/رقم, Nom/النسب, Prénom/الاسم, « Nom et prénom »/« Nom complet »
const simple = [['N°','Nom','Prénom'],['1','ALAOUI','Sara'],['2','AMRANI','Yassine']];
expect(depuisTableau(simple, detecterColonnes(simple)!)).toEqual([{numero:1,nom:'ALAOUI',prenom:'Sara'},{numero:2,nom:'AMRANI',prenom:'Yassine'}]);

// Massar : bloc d'en-tête, lignes vides, colonnes décalées, ligne de total à la fin
const massar = [['Académie …','',''],['','',''],['Classe : 3AC-2','',''],['','N° ordre','Code Massar','Nom','Prénom'],['','1','R130001','BENNANI','Salma'],['','2','R130002','CHRAIBI','Omar'],['','','','','']];
const c = detecterColonnes(massar)!;
expect(c.ligneEntetes).toBe(3);
expect(depuisTableau(massar, c)).toHaveLength(2);

// sans colonne numéro : numérotation 1..n ; « Nom et prénom » : premier mot = nom, reste = prénom
// aucun en-tête reconnu -> null
expect(detecterColonnes([['a','b'],['c','d']])).toBeNull();

// texte libre ou OCR
expect(depuisTexte('1 ALAOUI Sara\n2. AMRANI Yassine\n\nBENNANI Salma')).toEqual([
  {numero:1,nom:'ALAOUI',prenom:'Sara'},{numero:2,nom:'AMRANI',prenom:'Yassine'},{numero:3,nom:'BENNANI',prenom:'Salma'}]);
```

- [ ] **Step 2 :** échec. **Step 3 :** Implémenter. La ligne d'en-têtes est la première ligne (parmi les 30 premières) où au moins une colonne « nom » ou « nom complet » est reconnue. Lignes sans nom ignorées. **Step 4 :** succès. **Step 5 :** Commit `feat: import des listes (logique)`.

### Task 7 : Interpréteur vocal

**Files:** Create `src/voix/interpreteur.ts` · Test `src/voix/interpreteur.test.ts`

**Interfaces:**
- Consumes : `normaliser`, `distance`.
- Produces :

```ts
export type Resultat =
  | { sorte: 'action'; eleveIds: string[]; typeId: string }
  | { sorte: 'choix'; texte: string; eleves: { entendu: string; candidats: string[] }[]; eleveIds: string[]; types: string[] }
  | { sorte: 'incompris'; texte: string };
export function interpreter(texte: string, eleves: Eleve[], types: TypeObservation[]): Resultat;
```

- [ ] **Step 1 :** Tests, avec la classe : 4 Omar CHRAIBI, 12 Salma BENNANI, 17 Yassine AMRANI, 23 Yassine TAZI, et le catalogue de départ plus une observation ajoutée « Chewing-gum » :

```ts
expect(i('numéro 12 absent')).toEqual({ sorte: 'action', eleveIds: [salma], typeId: absent });
expect(i('numéro douze absent')).toEqual({ sorte: 'action', eleveIds: [salma], typeId: absent });
expect(i('Salma participation plus')).toMatchObject({ sorte: 'action', eleveIds: [salma], typeId: bonneParticipation });
expect(i('Selma participation plus')).toMatchObject({ sorte: 'action', eleveIds: [salma] });   // distance 1, candidat unique
expect(i('sans uniforme Omar et Salma')).toMatchObject({ sorte: 'action', eleveIds: [omar, salma], typeId: sansUniforme });
expect(i('absents 4, 17 et 23')).toMatchObject({ sorte: 'action', eleveIds: [omar, yassineA, yassineT], typeId: absent });
expect(i('Yassine en retard')).toMatchObject({ sorte: 'choix', eleves: [{ entendu: 'yassine', candidats: [yassineA, yassineT] }], types: [retard] });
expect(i('Yassine Tazi en retard')).toMatchObject({ sorte: 'action', eleveIds: [yassineT] });
expect(i('Omar chewing-gum')).toMatchObject({ sorte: 'action', typeId: chewingGum });
expect(i('numéro 40 absent')).toEqual({ sorte: 'incompris', texte: 'numéro 40 absent' });
expect(i('bonjour tout le monde')).toMatchObject({ sorte: 'incompris' });
expect(i('Omar')).toMatchObject({ sorte: 'incompris' });  // aucune observation
```

- [ ] **Step 2 :** échec.
- [ ] **Step 3 :** Implémenter :
  1. Normaliser ; convertir les nombres en lettres de « un » à « soixante » en chiffres.
  2. Observation : chercher le libellé ou synonyme (normalisé) le plus long contenu dans le texte, parmi les types non masqués et non `deleted` ; le retirer du texte. Aucun → `incompris`. Plusieurs de même longueur → tous dans `types`.
  3. Élèves : retirer les mots vides (`numero, n, le, la, les, et, pour, a, est, sont, eleve`). Chaque nombre → élève de ce numéro (absent de la classe → `incompris`). Les mots restants : essayer d'abord les paires consécutives prénom+nom ou nom+prénom, puis les mots seuls contre prénoms et noms ; correspondance exacte d'abord, sinon distance ≤ 1 pour les mots de 4 lettres et plus (≤ 2 à partir de 7 lettres).
  4. Tous les élèves résolus sans ambiguïté et un seul type → `action`. Sinon, au moins une ambiguïté → `choix` (`eleveIds` contient les élèves déjà sûrs). Aucun élève → `incompris`.
- [ ] **Step 4 :** succès. **Step 5 :** Commit `feat: interpréteur de commandes vocales`.

### Task 8 : Stockage local et séances

**Files:** Create `src/stockage/base.ts`, `src/stockage/depot.ts`, `src/stockage/seances.ts` · Test `src/stockage/depot.test.ts`, `src/stockage/seances.test.ts`

**Interfaces:**
- Produces :

```ts
// base.ts
export interface EnAttente { cle: string; table: NomTable; id: string } // cle = `${table}:${id}`
export const base: Dexie & { [T in NomTable]: Table<any, string> } & { file_attente: Table<EnAttente, string>; meta: Table<{ cle: string; valeur: string }, string> };
// depot.ts
export function nouvelId(): string; // crypto.randomUUID()
export async function enregistrer<T extends Base>(table: NomTable, ligne: Omit<T, keyof Base> & Partial<Base>): Promise<T>; // pose id, updated_at, deleted:false ; ajoute à file_attente
export async function supprimer(table: NomTable, id: string): Promise<void>; // deleted:true
export async function lister<T extends Base>(table: NomTable, filtre?: Partial<T>): Promise<T[]>; // sans les deleted
export async function initialiser(): Promise<void>; // si types_observation et regles sont vides : catalogue de départ ; crée la ligne 'parametres' si absente
export async function annulerDerniereObservation(seanceId: string): Promise<Observation | null>;
// seances.ts
export async function ouvrirSeance(classeId: string, maintenant: Date, creneau: Creneau | null): Promise<Seance>;
```

- [ ] **Step 1 :** Tests `depot` : `enregistrer` pose un `id`, un `updated_at` ISO et `deleted false`, et crée une entrée `file_attente` de clé `classes:<id>` ; deux enregistrements de la même ligne ne laissent qu'une entrée en file ; `supprimer` marque `deleted` et `lister` ne la renvoie plus ; `initialiser` appelé deux fois laisse 14 types et 5 règles ; `annulerDerniereObservation` marque `deleted` l'observation au plus grand `horodatage` de la séance et renvoie `null` s'il n'y en a pas.
- [ ] **Step 2 :** Tests `seances` : deux appels simultanés `Promise.all([ouvrirSeance(c, t, null), ouvrirSeance(c, t, null)])` renvoient la même séance et une seule ligne existe ; un appel 1 h 59 plus tard reprend la séance ; 2 h 01 plus tard en crée une nouvelle ; une séance `terminee` de moins de 2 h est rouverte (`terminee false`) ; avec un créneau, la séance du même `creneau_id` et du même jour est reprise même après 2 h.
- [ ] **Step 3 :** échec. **Step 4 :** Implémenter. Dexie version 1 ; index : `eleves: id, classe_id`, `seances: id, classe_id, debut`, `observations: id, seance_id, eleve_id, horodatage`, `creneaux: id, classe_id, jour`, `attributions: id, eleve_id`, les autres `id`. `ouvrirSeance` s'exécute dans une transaction Dexie en lecture-écriture sur `seances` et `file_attente`. **Step 5 :** succès. **Step 6 :** Commit `feat: stockage local et ouverture de séance`.

### Task 9 : Synchronisation et Supabase

**Files:** Create `src/stockage/distant.ts`, `src/stockage/synchro.ts`, `supabase/migrations/0001_init.sql` · Test `src/stockage/synchro.test.ts`

**Interfaces:**
- Consumes : `base`, `EnAttente`.
- Produces :

```ts
// distant.ts
export interface Distant { pousser(table: NomTable, lignes: Base[]): Promise<void>; tirer(table: NomTable, depuis: string | null): Promise<Base[]> }
export function distantSupabase(client: SupabaseClient): Distant;
export const client: SupabaseClient | null; // null en mode local
// synchro.ts
export type EtatSynchro = { etat: 'local' | 'synchronise' | 'en_attente' | 'hors_ligne'; enAttente: number };
export async function synchroniser(distant: Distant): Promise<void>; // pousser puis tirer
export function demarrerSynchro(distant: Distant | null): () => void; // au démarrage, sur 'online', sur focus, et 2 s après chaque écriture
export function useEtatSynchro(): EtatSynchro;
```

- [ ] **Step 1 :** Tests avec un `Distant` factice en mémoire :
  - après `enregistrer` puis `synchroniser`, la ligne est chez le distant et `file_attente` est vide ;
  - si `pousser` rejette (hors ligne), la file garde ses entrées, `synchroniser` ne lève pas, et un second appel réussi les envoie ;
  - **rechargement** : fermer et rouvrir `base` (`base.close(); await base.open()`) conserve la file, et `synchroniser` envoie ensuite les lignes ;
  - `tirer` : une ligne distante plus récente remplace la locale ; une ligne distante plus ancienne que la locale est ignorée ; une ligne distante `deleted` disparaît de `lister` ;
  - une ligne tirée n'est pas remise en file d'attente ;
  - `meta` mémorise par table le plus grand `updated_at` reçu, passé en `depuis` à l'appel suivant.
- [ ] **Step 2 :** échec. **Step 3 :** Implémenter. L'adaptateur Supabase fait `upsert` par lots de 500 et `select().gt('updated_at', depuis)`. Le serveur n'écrase pas `updated_at` (c'est l'horloge de l'appareil qui fait foi).
- [ ] **Step 4 :** Écrire `0001_init.sql` : une table par `NomTable` avec les colonnes des types (`id uuid primary key`, `user_id uuid not null default auth.uid() references auth.users`, `updated_at timestamptz not null`, `deleted boolean not null default false` ; `parametres.id text` avec clé primaire `(user_id, id)`), index sur `(user_id, updated_at)`, `enable row level security`, et une politique `for all using (user_id = auth.uid()) with check (user_id = auth.uid())` par table.
- [ ] **Step 5 :** succès des tests. **Step 6 :** Commit `feat: synchronisation et schéma Supabase`.

### Task 10 : Connexion, navigation, classes, élèves et import (écrans)

**Files:** Create `src/ecrans/Connexion.tsx`, `src/ecrans/reglages/Reglages.tsx`, `Classes.tsx`, `Eleves.tsx`, `ImportEleves.tsx`, `Parametres.tsx`, `src/import/fichiers.ts`, `src/composants/{Bouton,Feuille,EnTete,IndicateurSynchro}.tsx` · Modify `src/App.tsx`, `src/styles.css` · Test `src/ecrans/reglages/ImportEleves.test.tsx`

**Interfaces:**
- Consumes : `depot`, `detecterColonnes`, `depuisTableau`, `depuisTexte`, `useEtatSynchro`, `client`.
- Produces : `lireTableur(fichier: File): Promise<string[][]>` (xlsx, première feuille, cellules en texte), `lireImage(fichier: File): Promise<string>` (tesseract.js, langue `fra`). Routes : `/` accueil, `/seance/:id`, `/eleve/:id`, `/emploi-du-temps`, `/reglages`, `/reglages/classes`, `/reglages/classes/:id` (élèves), `/reglages/classes/:id/plan`, `/reglages/catalogue`, `/reglages/regles`, `/reglages/parametres`, `/exports`.

- [ ] **Step 1 :** Test de composant : sur `ImportEleves`, coller dans la saisie manuelle « ALAOUI Sara\nAMRANI Yassine », toucher « Aperçu » → un tableau de 2 lignes modifiables numérotées 1 et 2 ; modifier le prénom de la ligne 2, toucher « Importer » → `lister('eleves', { classe_id })` renvoie 2 élèves avec le prénom modifié. Second test : un tableur sans en-tête reconnu affiche « Colonnes non reconnues » et des listes déroulantes pour choisir les colonnes nom, prénom et numéro.
- [ ] **Step 2 :** échec.
- [ ] **Step 3 :** Implémenter. En mode local, pas d'écran de connexion. Sinon : e-mail et mot de passe, « Créer un compte », « Mot de passe oublié ». `initialiser()` puis `demarrerSynchro` au démarrage. Écran Classes : créer (nom, niveau, année scolaire, par défaut l'année en cours), renommer, archiver, supprimer avec confirmation en toutes lettres et rappel d'exporter d'abord. Écran Élèves : ajouter, modifier, retirer, renuméroter (1..n dans l'ordre alphabétique nom puis prénom), bouton « Importer » avec trois onglets Fichier, Photo, Saisie, qui mènent tous au même aperçu. Importer dans une classe non vide ajoute à la suite. Paramètres : dates des deux semestres, établissement, professeur, matière.
- [ ] **Step 4 :** succès ; `npm run typecheck` ; essai manuel avec `npm run dev` à 360 × 800.
- [ ] **Step 5 :** Commit `feat: connexion, classes, élèves et import`.

### Task 11 : Emploi du temps et accueil (écrans)

**Files:** Create `src/ecrans/Accueil.tsx`, `src/ecrans/EmploiDuTemps.tsx`, `src/ecrans/CreneauFormulaire.tsx` · Test `src/ecrans/Accueil.test.tsx`

**Interfaces:**
- Consumes : `creneauCourant`, `seancesDuJour`, `chevauche`, `ouvrirSeance`.

- [ ] **Step 1 :** Tests (horloge simulée lundi 08:30, créneau lundi 08:00–09:00 pour « 3AC-2 » salle 7) : l'accueil affiche « En cours », « 3AC-2 », « 08:00 – 09:00 », « Salle 7 » et un bouton « Démarrer » ; toucher « Démarrer » crée une séance liée au créneau et navigue vers `/seance/<id>` ; sans aucun créneau, l'accueil affiche les cartes des classes non archivées et toucher une carte ouvre une séance sans créneau ; sans aucune classe, un message invite à créer la première classe avec un lien vers les réglages.
- [ ] **Step 2 :** échec.
- [ ] **Step 3 :** Implémenter. Emploi du temps : un jour à la fois avec des onglets Lun à Sam sous 700 px de large, grille de la semaine au-delà. Formulaire de créneau : jour, heure de début et de fin (listes par pas de 30 minutes de 08:00 à 19:00), classe, salle ; refuse fin ≤ début et tout chevauchement (« Ce créneau chevauche un autre créneau »). Action « Dupliquer vers un autre jour ».
- [ ] **Step 4 :** succès. **Step 5 :** Commit `feat: emploi du temps et accueil`.

### Task 12 : Écran Séance en liste

**Files:** Create `src/ecrans/seance/Seance.tsx`, `ListeEleves.tsx`, `PanneauObservations.tsx`, `NouvelleObservation.tsx`, `src/ecrans/seance/actions.ts`, `src/ecrans/reglages/Catalogue.tsx` · Test `src/ecrans/seance/Seance.test.tsx`, `src/ecrans/seance/actions.test.ts`

**Interfaces:**
- Produces (`actions.ts`) :

```ts
export async function observer(seanceId: string, eleveIds: string[], type: TypeObservation): Promise<Observation[]>; // copie critere, code, libelle, points
export async function basculerPresence(seanceId: string, eleveId: string, code: 'absent' | 'retard', type: TypeObservation): Promise<void>; // un second appui retire ; absent et retard s'excluent
```

- [ ] **Step 1 :** Tests `actions` : `observer` sur 3 élèves crée 3 observations portant les points du type ; modifier ensuite les points du type ne change pas les observations déjà créées ; `basculerPresence('absent')` deux fois ne laisse aucune absence active ; `absent` puis `retard` ne laisse que le retard.
- [ ] **Step 2 :** Tests d'écran : toucher l'élève 3 puis « Sans uniforme » → la ligne affiche une pastille Règlement et « −1 » ; « Annuler » la retire ; appui long sur l'élève 1, cocher 2 et 4, « Absent » → trois lignes marquées « A » ; « + Autre » dans Discipline, saisir « Chewing-gum », négatif, 1 point → l'observation est appliquée et le bouton « Chewing-gum » apparaît au prochain panneau ; les types `masque` n'apparaissent pas.
- [ ] **Step 3 :** échec.
- [ ] **Step 4 :** Implémenter. Liste triée par numéro. Panneau en feuille du bas, groupes dans l'ordre Présence, Règlement, Participation, Discipline, Sérieux, chacun avec sa couleur (`--presence #475569`, `--reglement #7c3aed`, `--participation #16a34a`, `--discipline #dc2626`, `--serieux #2563eb`) ; le panneau se ferme après un choix. Écran Catalogue des réglages : ajouter, renommer, changer les points, masquer, réordonner par boutons monter et descendre ; Absent et Retard ne peuvent être ni masqués ni supprimés.
- [ ] **Step 5 :** succès. **Step 6 :** Commit `feat: écran séance en liste`.

### Task 13 : Plan de classe

**Files:** Create `src/ecrans/reglages/PlanDeClasse.tsx`, `src/ecrans/seance/PlanEleves.tsx` · Modify `src/ecrans/seance/Seance.tsx` · Test `src/ecrans/seance/PlanEleves.test.tsx`

- [ ] **Step 1 :** Tests : avec un plan 4 rangées × 6 colonnes et deux élèves placés, la vue Plan affiche 24 cases dont 2 nommées (prénom et numéro) ; toucher une case occupée ouvre le même panneau que la liste ; le bouton de bascule Liste/Plan mémorise le choix par classe (clé `meta` `vue:<classe_id>`) et il est restauré à la réouverture ; les élèves non placés apparaissent sous le plan dans une rangée « Non placés » et restent touchables.
- [ ] **Step 2 :** échec.
- [ ] **Step 3 :** Implémenter. Réglage du plan : nombre de rangées (1 à 10) et de colonnes (1 à 10), tableau en haut de l'écran ; placement par glisser-déposer avec @dnd-kit (capteurs pointeur et tactile) ; déposer sur une case occupée échange les deux élèves ; bouton « Placer automatiquement » dans l'ordre des numéros. La sélection multiple fonctionne aussi en vue Plan.
- [ ] **Step 4 :** succès. **Step 5 :** Commit `feat: plan de classe`.

### Task 14 : Règles, fin de séance et fiche élève

**Files:** Create `src/ecrans/reglages/Regles.tsx`, `src/ecrans/seance/ResumeSeance.tsx`, `src/ecrans/eleve/FicheEleve.tsx`, `src/composants/SelecteurPeriode.tsx`, `src/ecrans/eleve/donneesFiche.ts`, `src/impression.css` · Test `src/ecrans/seance/ResumeSeance.test.tsx`, `src/ecrans/eleve/donneesFiche.test.ts`

**Interfaces:**
- Consumes : `proposer`, `calculerTotaux`, `resoudrePeriode`.
- Produces :

```ts
export interface DonneesFiche { eleve: Eleve; classe: Classe; intervalle: Intervalle; totaux: Totaux; absences: Observation[]; retards: Observation[]; observations: Observation[]; attributions: Attribution[] }
export async function donneesFiche(eleveId: string, choix: ChoixPeriode, aujourdHui: Date): Promise<DonneesFiche>; // observations triées de la plus récente à la plus ancienne ; attributions validées de la période
```

- [ ] **Step 1 :** Tests `donneesFiche` : avec des observations en octobre et en novembre, le choix `mois` (novembre) ne renvoie que celles de novembre et des totaux correspondants ; `dates` du 1er au 31 octobre ne renvoie que celles d'octobre ; les attributions `proposee` et `refusee` sont exclues.
- [ ] **Step 2 :** Tests `ResumeSeance` : la séance affiche les nombres d'absents et de retards et le nombre d'observations par critère ; un élève arrivé à −5 en discipline ce mois fait apparaître « Avertissement » avec « Valider » et « Refuser » ; « Valider » crée une attribution `validee`, « Refuser » une attribution `refusee`, et rouvrir le résumé ne la repropose pas ; « Terminer » marque la séance `terminee` et revient à l'accueil.
- [ ] **Step 3 :** échec.
- [ ] **Step 4 :** Implémenter. Fiche élève : `SelecteurPeriode` en haut (Semaine, Mois, Semestre 1, Semestre 2, Année, Dates au choix avec deux champs date), semestre courant par défaut ; cartes de totaux par critère aux couleurs des critères ; liste des observations ; badges et sanctions ; remarques modifiables ; bouton « Attribuer » (badge ou sanction, libellé libre) ; bouton « Imprimer / PDF » (`window.print()`, feuille `@media print` A4 portrait, une page, sans navigation). La fiche s'ouvre depuis le panneau de l'élève en séance et depuis la liste des élèves. Écran Règles : créer, modifier, supprimer ; champs nom, type, cible, seuil, période ; le signe du seuil est posé d'après le type et la cible (négatif pour une sanction sur un critère ou sur le total).
- [ ] **Step 5 :** succès. **Step 6 :** Commit `feat: règles, fin de séance et fiche élève par période`.

### Task 15 : Commande vocale (écran)

**Files:** Create `src/voix/ecoute.ts`, `src/ecrans/seance/BoutonMicro.tsx`, `src/ecrans/seance/BandeauVoix.tsx` · Modify `src/ecrans/seance/Seance.tsx`, `NouvelleObservation.tsx`, `FicheEleve.tsx` · Test `src/ecrans/seance/BandeauVoix.test.tsx`

**Interfaces:**
- Consumes : `interpreter`, `observer`.
- Produces : `voixDisponible(): boolean` ; `ecouter(surTexte: (t: string) => void, surErreur: (code: string) => void): () => void` (`SpeechRecognition` ou `webkitSpeechRecognition`, `lang 'fr-FR'`, `interimResults false`, `maxAlternatives 3`).

- [ ] **Step 1 :** Tests avec `ecouter` simulé : le texte « numéro 12 absent » applique l'absence et affiche « Salma BENNANI : Absent » avec un bouton « Annuler » actif 5 secondes ; « Yassine en retard » affiche deux boutons de choix et n'enregistre rien avant un appui, puis enregistre le retard pour l'élève choisi ; un texte incompris affiche « Non compris : … » et n'enregistre rien ; si `voixDisponible()` est faux, le bouton micro n'est pas rendu ; hors ligne (`navigator.onLine` faux), le bouton est désactivé avec le libellé « Voix indisponible hors ligne ».
- [ ] **Step 2 :** échec.
- [ ] **Step 3 :** Implémenter. Quand la reconnaissance fournit plusieurs alternatives, retenir la première qui donne `action`, sinon la première qui donne `choix`, sinon `incompris` avec la première. Erreur `not-allowed` : message « Micro refusé : autorisez-le dans les réglages de Chrome ». Ajouter un petit micro de dictée aux champs « + Autre » et « Remarques ».
- [ ] **Step 4 :** succès. **Step 5 :** Commit `feat: commande vocale en séance`.

### Task 16 : Exports Excel A4 en couleurs

**Files:** Create `src/export/styles.ts`, `src/export/classeurs.ts`, `src/export/telecharger.ts`, `src/ecrans/Exports.tsx` · Test `src/export/classeurs.test.ts`

**Interfaces:**
- Consumes : `calculerTotaux`, `resoudrePeriode`, `donneesFiche`, `seancesDuJour`.
- Produces :

```ts
export interface EnTeteDoc { etablissement: string; professeur: string; matiere: string; classe: string; annee: string; periode: string; titre: string }
export function listeDeClasse(e: EnTeteDoc, eleves: Eleve[]): ExcelJS.Workbook;                                   // portrait
export function registrePresence(e: EnTeteDoc, eleves: Eleve[], seances: Seance[], obs: Observation[]): ExcelJS.Workbook; // paysage
export function bilanComportement(e: EnTeteDoc, eleves: Eleve[], totaux: Map<string, Totaux>, attributions: Attribution[]): ExcelJS.Workbook; // paysage
export function ficheEleve(e: EnTeteDoc, d: DonneesFiche): ExcelJS.Workbook;                                       // portrait
export function emploiDuTemps(e: EnTeteDoc, creneaux: Creneau[], classes: Classe[]): ExcelJS.Workbook;            // paysage
export function sauvegardeComplete(tables: Record<NomTable, object[]>): ExcelJS.Workbook;                         // brute, une feuille par table
export async function telecharger(classeur: ExcelJS.Workbook, nomFichier: string): Promise<void>;
```

- [ ] **Step 1 :** Tests sur les classeurs produits (relus en mémoire) :

```ts
const f = bilanComportement(entete, eleves45, totaux, []).worksheets[0];
expect(f.pageSetup).toMatchObject({ paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 });
expect(f.pageSetup.printTitlesRow).toBe(`${L}:${L}`);            // L = ligne des titres de colonnes
expect(f.getRow(1).getCell(1).value).toBe('Bilan de comportement');
expect(f.getRow(L).getCell(1).font).toMatchObject({ bold: true, color: { argb: 'FFFFFFFF' } });
expect(f.getRow(L).getCell(1).fill).toMatchObject({ type: 'pattern', pattern: 'solid' });
expect(f.headerFooter.oddFooter).toContain('&P');                 // numéro de page
expect(f.rowCount).toBeGreaterThanOrEqual(L + 45);
// un total négatif : écrit avec son signe ET en rouge ; un total positif : préfixé « + » ET en vert
// registre : une absence vaut 'A' sur fond rouge clair, un retard 'R' sur fond orange clair, colonnes Total A et Total R en fin de ligne
// lignes de données alternées : une ligne sur deux a un fond teinté
// classe vide : le classeur est produit, avec la ligne « Aucun élève »
// listeDeClasse : orientation 'portrait', 8 colonnes vides bordées après Prénom
// sauvegardeComplete : 9 feuilles nommées comme les tables
```

- [ ] **Step 2 :** échec.
- [ ] **Step 3 :** Implémenter. `styles.ts` : fonction commune `preparerFeuille(classeur, enTete, orientation, colonnes)` qui pose le bandeau de titre coloré (fusionné), les lignes établissement, professeur et matière, classe, année, période, puis la ligne de titres, les marges (0,5 pouce), `paperSize 9`, l'ajustement en largeur, les titres répétés, le pied de page « Édité le JJ/MM/AAAA — Page &P / &N », et renvoie le numéro de la ligne de titres. Couleurs : bandeau `FF1E3A8A` ; titres de colonnes par critère aux couleurs de l'application (tâche 12) ; positif `FF15803D`, négatif et absence `FFB91C1C`, retard `FFC2410C` ; fonds clairs `FFDCFCE7`, `FFFEE2E2`, `FFFFEDD5` ; lignes alternées `FFF1F5F9` ; totaux `FFDBEAFE` en gras. Bordures fines sur toutes les cellules du tableau. Largeurs de colonnes calculées d'après le contenu le plus long, bornées entre 4 et 32. Écran Exports : choix de l'export, de la classe, de la période (`SelecteurPeriode`), de l'élève pour la fiche ; nom de fichier `<export>_<classe>_<période>.xlsx`.
- [ ] **Step 4 :** succès. **Step 5 :** Commit `feat: exports Excel A4 en couleurs`.

### Task 17 : Parcours de bout en bout, PWA et mise en ligne

**Files:** Create `playwright.config.ts`, `e2e/parcours.spec.ts`, `vercel.json`, `README.md`, `docs/essais-sur-telephone.md` · Modify `vite.config.ts`

- [ ] **Step 1 :** Écrire le parcours Playwright (appareil `Pixel 7`, mode local, `--trace off`) : créer la classe « 3AC-2 » ; importer 5 élèves par saisie manuelle ; créer un créneau couvrant l'heure courante ; depuis l'accueil toucher « Démarrer » ; marquer l'élève 2 absent ; donner cinq fois « Bavardage » à l'élève 3 ; « Terminer la séance » → la proposition « Avertissement » apparaît, la valider ; ouvrir la fiche de l'élève 3 → Discipline « −5 » et la sanction « Avertissement » ; choisir la période « Dates au choix » sur le mois dernier → « Aucune observation » ; recharger la page → les données sont toujours là ; lancer l'export « Bilan de comportement » → un fichier `.xlsx` est téléchargé.
- [ ] **Step 2 :** `npm run e2e` → échecs à corriger jusqu'au succès.
- [ ] **Step 3 :** Vérifier la PWA : `npm run build && npm run preview`, le manifeste et le service worker sont servis, l'application se recharge hors ligne (test Playwright `context.setOffline(true)` puis rechargement → l'accueil s'affiche).
- [ ] **Step 4 :** `vercel.json` avec la réécriture de toutes les routes vers `/index.html`. `README.md` : lancer, tester, variables d'environnement, application de la migration SQL. `docs/essais-sur-telephone.md` : la liste d'essais de cinq minutes (installation sur l'écran d'accueil, dix phrases à dicter, photo d'une liste, impression A4 d'un export).
- [ ] **Step 5 :** `npm test && npm run typecheck && npm run e2e && npm run build` → tout au vert.
- [ ] **Step 6 :** Commit `test: parcours de bout en bout, PWA et mise en ligne`.

---

## Après le plan : actions qui demandent le professeur

Ces étapes touchent des comptes extérieurs et ne sont lancées qu'avec son accord explicite :

1. Créer le dépôt GitHub et y pousser le code.
2. Créer le projet Supabase, appliquer `0001_init.sql`, désactiver l'inscription publique après la création de son compte.
3. Créer le projet d'hébergement, y renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`, déployer.
4. Faire les essais de `docs/essais-sur-telephone.md` sur son téléphone.

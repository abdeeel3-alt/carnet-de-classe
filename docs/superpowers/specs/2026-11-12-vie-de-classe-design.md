# Carnet de classe — Module 1 : Vie de classe

Document de conception — 12 novembre 2026

## 1. Objectif

Permettre à un professeur de mathématiques (2ᵉ et 3ᵉ année collège, programme marocain, enseignement en français) de suivre la vie de ses classes pendant la séance, en quelques gestes ou à la voix, sans perdre de temps d'enseignement.

Ce document couvre le module 1. Deux autres modules suivront, chacun avec son propre document :

- Module 2, Évaluation : devoirs, recherches, pré-contrôles, contrôles continus, notes, moyennes, statistiques, catégories d'élèves, soutien.
- Module 3, Préparation pédagogique : répartitions, fiches pédagogiques, activités, quiz, résumés, séries d'exercices, olympiades.

### Critères de réussite

- Faire l'appel d'une classe de 40 élèves avec 3 absents en moins de 20 secondes.
- Enregistrer une observation sur un élève en 2 gestes au plus, ou en une phrase dictée.
- Aucune attente à l'écran pendant la saisie, même si la connexion est lente ou coupée.
- Les mêmes données sur le téléphone, la tablette et l'ordinateur.

### Hors périmètre du module 1

- Comptes élèves ou parents, envoi de messages aux parents.
- Notes, devoirs et contrôles (module 2).
- Emploi du temps automatique : la séance est ouverte à la main en touchant la classe.
- Interface en arabe.

## 2. Décisions prises

| Sujet | Décision |
|---|---|
| Utilisateur | Un seul professeur par compte |
| Appareils | Téléphone Android en classe (avec Internet), tablette ou ordinateur à la maison |
| Type d'application | Application web installable (PWA), ouverte dans Chrome |
| Synchronisation | Automatique, par compte, via Supabase |
| Listes d'élèves | Import Excel, saisie manuelle ou photo, au choix |
| Voix | Français ; élève désigné par son nom, son prénom ou son numéro |
| Suivi | Points positifs et négatifs par critère |
| Affichage en séance | Liste numérotée ou plan de classe, au choix |
| Badges et sanctions | Proposés aux seuils fixés, validés par le professeur ; attribution manuelle possible |
| Listes d'options | Extensibles par le professeur à tout moment |
| Fiche élève | Détaillée, sur une période au choix |

## 3. Écrans

### 3.1 Accueil

- Une carte par classe (nom, niveau, effectif).
- Toucher une carte ouvre la séance du jour pour cette classe. Si une séance a déjà été ouverte pour cette classe dans les 2 dernières heures, elle est reprise ; sinon une nouvelle séance est créée.
- Accès aux réglages et à l'indicateur de synchronisation.

### 3.2 Séance

Écran principal en classe.

- Bouton pour basculer entre **liste numérotée** et **plan de classe**. Le dernier choix est mémorisé par classe.
- Tous les élèves sont présents et en règle par défaut ; seules les exceptions sont saisies.
- Toucher un élève ouvre un panneau de gros boutons, regroupés par critère :
  - Présence : Absent, Retard
  - Règlement : Sans uniforme, et les autres manquements du catalogue
  - Participation, Discipline, Sérieux : les observations positives et négatives du catalogue
  - Chaque groupe se termine par **+ Autre**
- Un appui long sur un élève active la **sélection multiple** : on coche plusieurs élèves puis on applique une même observation à tous.
- Chaque élève affiche ses marques de la séance (pastilles colorées) et son total de points de la séance.
- Bouton **Annuler** toujours visible : il retire la dernière observation saisie. Toute observation peut aussi être supprimée depuis le détail de l'élève.
- Bouton **micro** en bas de l'écran (voir section 5).
- Bouton **Terminer la séance** : ouvre le résumé.

### 3.3 Ajout d'une observation (+ Autre)

- Champ de texte, saisi au clavier ou dicté.
- Choix du critère, du sens (positive ou négative) et du nombre de points.
- L'observation est appliquée à l'élève et ajoutée au catalogue pour les fois suivantes.

### 3.4 Résumé de fin de séance

- Absents, retards, nombre d'observations par critère.
- Badges et sanctions proposés parce qu'un seuil est atteint : chacun se valide ou se refuse d'un geste.

### 3.5 Fiche élève

- **Sélecteur de période** en haut : cette semaine, ce mois, semestre 1, semestre 2, année, ou deux dates au choix. Tout le contenu de la fiche suit la période choisie.
- Contenu :
  - Nombre d'absences et de retards, avec les dates
  - Total de points par critère et total général
  - Liste chronologique des observations
  - Badges et sanctions reçus
  - Remarques libres du professeur (saisies ou dictées)
- Bouton **Imprimer / PDF** : produit la fiche de la période sur une page, par l'impression du navigateur.
- Bouton d'attribution manuelle d'un badge ou d'une sanction.

### 3.6 Réglages

- **Classes** : créer, renommer, archiver, supprimer.
- **Élèves** : ajouter, modifier, retirer, renuméroter ; import (section 6).
- **Plan de classe** : grille de rangées et de tables ; placement des élèves par glisser-déposer.
- **Catalogue d'observations** : ajouter, renommer, réordonner, masquer ; régler les points.
- **Badges et sanctions** : créer les règles et leurs seuils.
- **Semestres** : dates de début et de fin des deux semestres.
- **Export** : toutes les données en un fichier Excel.

## 4. Points, badges et sanctions

### Points

- Chaque observation du catalogue porte un nombre de points, positif, négatif ou nul.
- Absent et Retard valent 0 point par défaut : ils sont comptés à part. Le professeur peut leur donner des points négatifs.
- Les totaux ne sont jamais stockés : ils sont recalculés à partir des observations. Supprimer une observation corrige donc tous les totaux.

### Catalogue de départ (modifiable)

| Critère | Observation | Points |
|---|---|---|
| Présence | Absent | 0 |
| Présence | Retard | 0 |
| Règlement | Sans uniforme | −1 |
| Règlement | Matériel oublié | −1 |
| Règlement | Téléphone en classe | −2 |
| Participation | Bonne participation | +1 |
| Participation | Passage au tableau | +1 |
| Participation | Excellente réponse | +2 |
| Discipline | Bavardage | −1 |
| Discipline | Perturbe le cours | −2 |
| Discipline | Manque de respect | −3 |
| Sérieux | Travail soigné | +1 |
| Sérieux | Travail non fait | −1 |
| Sérieux | Ne suit pas | −1 |

### Règles de badges et de sanctions

Une règle se compose de : un nom, un type (badge ou sanction), un critère (ou « total général », ou « nombre d'absences », ou « nombre de retards »), un seuil, et une période (semaine, mois, semestre).

Exemples fournis au départ, modifiables :

- Badge « Participant actif » : +10 en Participation sur le mois.
- Badge « Élève exemplaire » : +20 au total sur le semestre.
- Sanction « Avertissement » : −5 en Discipline sur le mois.
- Sanction « Convocation des parents » : −10 en Discipline sur le semestre.
- Sanction « Signalement à l'administration » : 3 retards sur le mois.

Quand une règle est atteinte, une **proposition** est créée. Elle apparaît dans le résumé de fin de séance. Validée, elle devient un badge ou une sanction dans la fiche de l'élève. Refusée, elle n'est plus proposée pour la même période.

## 5. Commande vocale

- Un appui sur le micro lance l'écoute, en français, par la reconnaissance vocale de Chrome.
- Formes reconnues : `<élève(s)> <observation>`, dans les deux ordres.
  - « numéro 12 absent »
  - « Salma participation plus »
  - « Omar et Yassine sans uniforme »
  - « absents : 4, 17 et 23 »
- **Élève** : recherché uniquement dans la classe ouverte, par numéro, prénom, nom, ou prénom et nom, avec tolérance aux écarts de prononciation et de transcription.
- **Observation** : recherchée dans le catalogue, y compris les observations ajoutées par le professeur, avec quelques synonymes courants (« plus », « moins », « en retard »).
- L'application affiche ce qu'elle a compris dans un bandeau :
  - Correspondance sûre : appliquée tout de suite, avec un bouton Annuler pendant quelques secondes.
  - Hésitation entre plusieurs élèves ou observations : elle propose les choix, rien n'est appliqué avant le geste du professeur.
  - Rien de compris : elle affiche le texte entendu et n'applique rien.
- La voix a besoin d'Internet. Sans connexion, le micro est grisé et tout reste faisable au doigt.

## 6. Import des listes d'élèves

Les trois modes aboutissent au même écran d'**aperçu** : un tableau numéro, nom, prénom, modifiable ligne par ligne avant validation.

- **Excel** (.xlsx, .xls, .csv) : l'application repère les colonnes nom, prénom et numéro d'après leurs en-têtes ; le professeur peut corriger la correspondance des colonnes. Les exports de Massar sont pris en charge par ce mécanisme.
- **Photo** : prise avec l'appareil photo ou choisie dans la galerie ; les noms sont lus par reconnaissance de texte dans le navigateur, puis présentés dans l'aperçu.
- **Saisie manuelle** : un élève par ligne, numérotation automatique.

Les noms en caractères latins sont attendus. La lecture de photos en caractères arabes n'est pas garantie dans cette version.

## 7. Données

Toutes les tables portent l'identifiant du professeur ; la base refuse tout accès aux lignes d'un autre compte (sécurité au niveau des lignes).

| Table | Contenu |
|---|---|
| `classes` | nom, niveau (2AC ou 3AC), année scolaire, archivée, dimensions du plan de classe |
| `eleves` | classe, numéro, nom, prénom, rangée et colonne dans le plan, remarques |
| `seances` | classe, date et heure de début, terminée |
| `types_observation` | critère, libellé, points, ordre, masqué, synonymes vocaux |
| `observations` | séance, élève, type d'observation, points au moment de la saisie, heure, supprimée |
| `regles` | nom, type (badge ou sanction), critère ou compteur, seuil, période |
| `attributions` | élève, règle ou libellé libre, date, état (proposée, validée, refusée), période concernée |
| `parametres` | dates des semestres, préférences d'affichage |

Les points sont copiés dans chaque observation au moment de la saisie : modifier plus tard la valeur d'une observation du catalogue ne change pas le passé.

## 8. Synchronisation et hors ligne

- Chaque action est écrite d'abord dans une base locale sur l'appareil, et l'écran se met à jour aussitôt.
- Une file d'attente envoie les changements à Supabase en arrière-plan et reprend seule après une coupure.
- À l'ouverture et au retour de la connexion, l'appareil récupère les changements faits ailleurs.
- En cas de modification de la même donnée sur deux appareils, la plus récente l'emporte. Les observations ne sont jamais modifiées, seulement ajoutées ou marquées supprimées, ce qui évite les pertes.
- Un indicateur montre l'état : synchronisé, en attente (avec le nombre de changements), hors ligne.

## 9. Architecture technique

- **Interface** : React, TypeScript, Vite, installable (PWA) avec fonctionnement hors ligne.
- **Base locale** : IndexedDB.
- **Serveur** : Supabase (base PostgreSQL, authentification par e-mail et mot de passe, sécurité au niveau des lignes).
- **Voix** : Web Speech API de Chrome.
- **Lecture de photos** : reconnaissance de texte exécutée dans le navigateur.
- **Excel** : lecture et écriture dans le navigateur.
- **Hébergement** : hébergement statique gratuit.

Découpage en unités indépendantes, chacune testable seule :

| Unité | Rôle |
|---|---|
| `points` | Calcule les totaux par élève, critère et période à partir des observations |
| `regles` | Détermine les propositions de badges et sanctions à partir des totaux |
| `voix/interpreteur` | Transforme un texte dicté et une liste d'élèves en actions, ou en demande de choix |
| `import` | Transforme un fichier Excel, un texte lu sur photo ou une saisie en liste d'élèves |
| `stockage` | Base locale, file d'attente, synchronisation |
| `periodes` | Convertit un choix de période en dates, selon les semestres réglés |
| Écrans | Affichent et appellent les unités ci-dessus, sans logique de calcul |

`points`, `regles`, `voix/interpreteur`, `import` et `periodes` sont des fonctions pures : elles ne dépendent ni de l'écran ni du réseau.

## 10. Erreurs et cas limites

- Connexion coupée : la saisie continue ; la voix et l'import par photo attendent le retour du réseau.
- Micro refusé ou navigateur sans reconnaissance vocale : le bouton micro est masqué, avec une explication dans les réglages.
- Fichier Excel illisible ou sans colonne reconnue : message clair et proposition de saisie manuelle.
- Deux élèves de même prénom : la voix propose le choix ; le numéro lève toujours l'ambiguïté.
- Élève arrivé ou parti en cours d'année : ajout en fin de liste ou retrait, sans perte de l'historique.
- Suppression d'une classe : confirmation explicite, après proposition d'export.

## 11. Tests

- **Automatiques** sur les unités pures : calcul des points, périodes, seuils des règles, interprétation de phrases dictées (y compris fautes de transcription et homonymes), import de fichiers Excel de formes variées.
- **Automatiques** sur la synchronisation : saisie hors ligne puis reprise, deux appareils.
- **De bout en bout** dans un navigateur simulant un téléphone Android : créer une classe, importer une liste, faire une séance, valider un badge, consulter une fiche sur une période.
- **À faire sur le téléphone du professeur** (non automatisable ici) : voix réelle en classe, appareil photo, installation sur l'écran d'accueil. Une liste d'essais de cinq minutes sera fournie.

## 12. Livraison

Par étapes, chacune utilisable :

1. Connexion, classes, élèves, import des listes.
2. Écran Séance au doigt : présence, observations, points, + Autre, annulation, sélection multiple.
3. Plan de classe, règles, badges et sanctions, résumé de fin de séance, fiche élève par période.
4. Commande vocale.
5. Export Excel, impression de la fiche, finitions.

Deux comptes sont à créer au nom du professeur avant la mise en ligne : Supabase (données) et un hébergeur (application). Les deux sont gratuits à cette échelle.

## 13. Données personnelles

L'application contient des données nominatives d'élèves mineurs. Mesures prévues : accès par mot de passe, isolation stricte par compte, export complet, suppression des classes en fin d'année. Le professeur reste responsable du respect des règles de son établissement et de la loi marocaine 09-08 sur la protection des données personnelles.

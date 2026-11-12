# Carnet de classe

Application web installable pour suivre la vie de ses classes : présence, comportement, points, badges et sanctions, au doigt ou à la voix. Module 1 (Vie de classe).

- Conception : `docs/superpowers/specs/2026-11-12-vie-de-classe-design.md`
- Plan de développement : `docs/superpowers/plans/2026-11-12-vie-de-classe.md`
- Essais à faire sur le téléphone : `docs/essais-sur-telephone.md`

## Lancer

```bash
npm install
```

```bash
npm run dev
```

Sans configuration, l'application démarre en **mode local** : les données restent sur l'appareil, sans compte ni synchronisation.

## Vérifier

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run e2e -- --trace off
```

`npm run e2e` construit l'application puis joue trois parcours complets sur un téléphone Android simulé. Il lui faut un Chromium pour Playwright (`npx playwright install chromium`).

## Synchronisation entre appareils (Supabase)

1. Créer un projet sur supabase.com.
2. Dans l'éditeur SQL du projet, exécuter le contenu de `supabase/migrations/0001_init.sql`.
3. Copier `.env.example` en `.env` et y renseigner l'adresse du projet (`VITE_SUPABASE_URL`) et sa clé publique (`VITE_SUPABASE_ANON_KEY`).
4. Créer son compte depuis l'écran de connexion de l'application, puis désactiver les inscriptions dans Supabase (Authentication › Sign In / Providers) pour que personne d'autre ne puisse en créer.

Chaque ligne appartient à un compte ; la sécurité au niveau des lignes interdit tout accès aux données d'un autre compte.

## Mettre en ligne

À chaque envoi sur la branche `main`, `.github/workflows/deploiement.yml` teste, construit et publie l'application sur GitHub Pages, à l'adresse https://abdeeel3-alt.github.io/carnet-de-classe/. Il faut activer une fois GitHub Pages dans le dépôt : Settings › Pages › Source : **GitHub Actions**.

Pour un autre hébergeur : `npm run build` produit le site statique dans `dist` ; `vercel.json` contient la règle de réécriture, et les deux variables `VITE_SUPABASE_*` doivent être renseignées avant la construction.

## Organisation du code

| Dossier | Rôle |
|---|---|
| `src/domaine` | Calculs purs : périodes, points, règles, emploi du temps, plan de classe |
| `src/voix` | Compréhension des phrases dictées et écoute du micro |
| `src/import` | Lecture des listes d'élèves (Excel, photo, saisie) |
| `src/export` | Fichiers Excel A4 en couleurs |
| `src/stockage` | Base locale, file d'attente, synchronisation |
| `src/ecrans`, `src/composants` | Interface |

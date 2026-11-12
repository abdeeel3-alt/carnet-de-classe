/**
 * Quel écran montrer au démarrage.
 * Sans session mais avec un compte déjà utilisé sur l'appareil (jeton expiré et pas de réseau, par exemple),
 * l'application s'ouvre quand même sur les données locales : la saisie en classe ne dépend jamais du réseau.
 */
export function ecranDeDemarrage(
  utilisateurLocal: string | undefined, session: string | null, connexionDemandee: boolean,
): { ecran: 'appli' | 'connexion'; synchro: boolean } {
  if (session) return { ecran: 'appli', synchro: true };
  if (utilisateurLocal && !connexionDemandee) return { ecran: 'appli', synchro: false };
  return { ecran: 'connexion', synchro: false };
}

export const connexionDemandee = () => new URLSearchParams(window.location.search).has('connexion');

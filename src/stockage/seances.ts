import type { Creneau, Seance } from '../domaine/types';
import { base } from './base';
import { enregistrer } from './depot';

const DEUX_HEURES = 2 * 60 * 60 * 1000;
const memeJour = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * Ouvre la séance de la classe, ou reprend celle qui existe : même créneau le même jour,
 * sinon séance de la classe commencée depuis moins de 2 heures. Une séance terminée reprise est rouverte.
 */
export async function ouvrirSeance(classeId: string, maintenant: Date, creneau: Creneau | null): Promise<Seance> {
  return base.transaction('rw', base.seances, base.file_attente, async () => {
    const deLaClasse: Seance[] = (await base.seances.where('classe_id').equals(classeId).toArray()).filter((s: Seance) => !s.deleted);
    const t = maintenant.getTime();
    const duCreneau = creneau
      ? deLaClasse.find((s) => s.creneau_id === creneau.id && memeJour(new Date(s.debut), maintenant))
      : undefined;
    const recente = deLaClasse
      .filter((s) => { const d = new Date(s.debut).getTime(); return d <= t && t - d < DEUX_HEURES; })
      .sort((a, b) => b.debut.localeCompare(a.debut))[0];
    const existante = duCreneau ?? recente;
    if (existante) return existante.terminee ? enregistrer<Seance>('seances', { ...existante, terminee: false }) : existante;
    return enregistrer<Seance>('seances', { classe_id: classeId, creneau_id: creneau?.id ?? null, debut: maintenant.toISOString(), terminee: false });
  });
}

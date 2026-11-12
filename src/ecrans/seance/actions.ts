import type { Observation, TypeObservation } from '../../domaine/types';
import { enregistrer, lister, supprimer } from '../../stockage/depot';

/** Applique une observation à un ou plusieurs élèves. Les points, le critère et le libellé du type sont copiés. */
export async function observer(seanceId: string, eleveIds: string[], type: TypeObservation): Promise<Observation[]> {
  const horodatage = new Date().toISOString();
  const crees: Observation[] = [];
  for (const eleve_id of eleveIds) {
    crees.push(await enregistrer<Observation>('observations', {
      seance_id: seanceId, eleve_id, type_id: type.id, critere: type.critere, code: type.code,
      libelle: type.libelle, points: type.points, horodatage,
    }));
  }
  return crees;
}

async function presences(seanceId: string, eleveId: string): Promise<Observation[]> {
  return (await lister<Observation>('observations', { seance_id: seanceId })).filter((o) => o.eleve_id === eleveId && o.code);
}

/** Interrupteur Absent / Retard : un second appui retire, et les deux s'excluent. */
export async function basculerPresence(seanceId: string, eleveId: string, type: TypeObservation): Promise<void> {
  const actuelles = await presences(seanceId, eleveId);
  for (const o of actuelles) await supprimer('observations', o.id);
  if (!actuelles.some((o) => o.code === type.code)) await observer(seanceId, [eleveId], type);
}

/** Pour une sélection : pose Absent ou Retard à chacun, sans jamais le retirer. */
export async function marquerPresence(seanceId: string, eleveIds: string[], type: TypeObservation): Promise<void> {
  const aMarquer: string[] = [];
  for (const id of eleveIds) {
    const actuelles = await presences(seanceId, id);
    if (actuelles.some((o) => o.code === type.code)) continue;
    for (const o of actuelles) await supprimer('observations', o.id);
    aMarquer.push(id);
  }
  await observer(seanceId, aMarquer, type);
}

/** Retire la dernière action de la séance : toutes les observations saisies au même instant. */
export async function annulerDerniereAction(seanceId: string): Promise<Observation[]> {
  const actives = await lister<Observation>('observations', { seance_id: seanceId });
  if (!actives.length) return [];
  const dernier = actives.reduce((m, o) => (o.horodatage > m ? o.horodatage : m), '');
  const retirees = actives.filter((o) => o.horodatage === dernier);
  for (const o of retirees) await supprimer('observations', o.id);
  return retirees;
}

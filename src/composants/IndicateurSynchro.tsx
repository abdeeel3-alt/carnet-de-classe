import { useEtatSynchro } from '../stockage/synchro';

/** Pastille d'état : synchronisé, en attente (avec le nombre de changements), hors ligne ou mode local. */
export default function IndicateurSynchro() {
  const { etat, enAttente } = useEtatSynchro();
  const texte = {
    local: 'Mode local',
    synchronise: '✓ Synchronisé',
    en_attente: `↻ ${enAttente} en attente`,
    hors_ligne: enAttente ? `Hors ligne · ${enAttente} en attente` : 'Hors ligne',
  }[etat];
  return <span className="synchro" role="status">{texte}</span>;
}

import { nomCourt, placeValide } from '../../domaine/plan';
import type { Eleve, Observation } from '../../domaine/types';
import { useAppuiLong } from './appuiLong';
import ListeEleves, { type PropsVue } from './ListeEleves';
import { classePresence, marques, Pastilles } from './marques';

function Case({ eleve, obs, selection, onToucher, onAppuiLong }: { eleve: Eleve; obs: Observation[] } & Omit<PropsVue, 'eleves' | 'observations'>) {
  const gestes = useAppuiLong(() => onToucher(eleve), () => onAppuiLong(eleve));
  const m = marques(obs);
  return (
    <button type="button" data-case className={`case occupee ${classePresence(m)}`} aria-pressed={selection ? selection.has(eleve.id) : undefined} {...gestes}>
      <b>{eleve.numero}</b>
      <span>{nomCourt(eleve)}</span>
      <Pastilles m={m} />
    </button>
  );
}

/** Les élèves à leur place réelle, tableau en haut ; ceux qui n'ont pas de place sont listés dessous. */
export default function PlanEleves({ eleves, observations, rangees, colonnes, ...reste }: PropsVue & { rangees: number; colonnes: number }) {
  const places = eleves.filter((e) => placeValide(e, rangees, colonnes));
  const nonPlaces = eleves.filter((e) => !placeValide(e, rangees, colonnes));
  const cases = [];
  for (let r = 0; r < rangees; r++) {
    for (let c = 0; c < colonnes; c++) {
      const e = places.find((x) => x.rangee === r && x.colonne === c);
      cases.push(e
        ? <Case key={`${r}-${c}`} eleve={e} obs={observations.get(e.id) ?? []} {...reste} />
        : <div key={`${r}-${c}`} data-case className="case" aria-hidden="true" />);
    }
  }
  return (
    <>
      <div className="plan" role="group" aria-label="Plan de classe" style={{ gridTemplateColumns: `repeat(${colonnes}, minmax(0, 1fr))`, padding: '8px 8px 0' }}>
        <div className="tableau-noir">TABLEAU</div>
        {cases}
      </div>
      {nonPlaces.length > 0 && (
        <div role="group" aria-label="Non placés" style={{ padding: '0 8px' }}>
          <h2 className="titre-section" style={{ margin: '10px 4px 6px' }}>Non placés</h2>
          <ListeEleves eleves={nonPlaces} observations={observations} {...reste} />
        </div>
      )}
    </>
  );
}

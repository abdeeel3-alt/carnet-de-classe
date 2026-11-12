import { signe } from '../../domaine/texte';
import type { Eleve, Observation } from '../../domaine/types';
import { useAppuiLong } from './appuiLong';
import { classePresence, marques, Pastilles } from './marques';

export interface PropsVue {
  eleves: Eleve[];
  observations: Map<string, Observation[]>;
  /** `null` hors mode sélection. */
  selection: Set<string> | null;
  onToucher: (e: Eleve) => void;
  onAppuiLong: (e: Eleve) => void;
}

function Ligne({ eleve, obs, selection, onToucher, onAppuiLong }: { eleve: Eleve; obs: Observation[] } & Omit<PropsVue, 'eleves' | 'observations'>) {
  const gestes = useAppuiLong(() => onToucher(eleve), () => onAppuiLong(eleve));
  const m = marques(obs);
  return (
    <li>
      <button type="button" className={`eleve ${classePresence(m)}`} aria-pressed={selection ? selection.has(eleve.id) : undefined} {...gestes}>
        <span className="numero">{eleve.numero}</span>
        <span className="principal">
          <strong>{eleve.nom} {eleve.prenom}</strong>
          <Pastilles m={m} />
        </span>
        {m.total !== 0 && (
          <span className={`points ${m.total > 0 ? 'positif' : 'negatif'}`} aria-label={`Total de la séance : ${signe(m.total)}`}>{signe(m.total)}</span>
        )}
      </button>
    </li>
  );
}

export default function ListeEleves({ eleves, observations, ...reste }: PropsVue) {
  return (
    <ul className="liste">
      {eleves.map((e) => <Ligne key={e.id} eleve={e} obs={observations.get(e.id) ?? []} {...reste} />)}
    </ul>
  );
}

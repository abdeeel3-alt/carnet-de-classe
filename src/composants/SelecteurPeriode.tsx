import { versIsoJour, type ChoixPeriode } from '../domaine/periodes';

const CHOIX: { type: ChoixPeriode['type']; nom: string }[] = [
  { type: 'semaine', nom: 'Semaine' }, { type: 'mois', nom: 'Mois' }, { type: 'semestre1', nom: 'Semestre 1' },
  { type: 'semestre2', nom: 'Semestre 2' }, { type: 'annee', nom: 'Année' }, { type: 'dates', nom: 'Dates' },
];

/** Choix de la période : préréglages, ou deux dates au choix. */
export default function SelecteurPeriode({ valeur, onChange }: { valeur: ChoixPeriode; onChange: (c: ChoixPeriode) => void }) {
  const aujourdHui = versIsoJour(new Date());
  const choisir = (type: ChoixPeriode['type']) =>
    onChange(type === 'dates' ? { type, debut: aujourdHui.slice(0, 8) + '01', fin: aujourdHui } : { type });
  return (
    <div className="carte sans-impression" role="group" aria-label="Période">
      <div className="options">
        {CHOIX.map((c) => <button key={c.type} type="button" aria-pressed={valeur.type === c.type} onClick={() => choisir(c.type)}>{c.nom}</button>)}
      </div>
      {valeur.type === 'dates' && (
        <div className="rangee">
          <label className="champ etire"><span>Du</span>
            <input type="date" value={valeur.debut} onChange={(e) => onChange({ ...valeur, debut: e.target.value })} />
          </label>
          <label className="champ etire"><span>Au</span>
            <input type="date" value={valeur.fin} onChange={(e) => onChange({ ...valeur, fin: e.target.value })} />
          </label>
        </div>
      )}
    </div>
  );
}

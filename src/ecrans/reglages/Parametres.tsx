import EnTete from '../../composants/EnTete';
import type { Parametres as P } from '../../domaine/types';
import { enregistrer } from '../../stockage/depot';
import { useParametres } from '../../stockage/hooks';

const TEXTES: [keyof P, string][] = [['etablissement', 'Établissement'], ['professeur', 'Nom du professeur'], ['matiere', 'Matière']];
const DATES: [keyof P, string][] = [
  ['semestre1_debut', 'Début du semestre 1'], ['semestre1_fin', 'Fin du semestre 1'],
  ['semestre2_debut', 'Début du semestre 2'], ['semestre2_fin', 'Fin du semestre 2'],
];

export default function Parametres() {
  const p = useParametres();
  if (!p) return <EnTete titre="Paramètres" retour="/reglages" />;
  const changer = (champ: keyof P, valeur: string) => enregistrer<P>('parametres', { ...p, [champ]: valeur });
  return (
    <>
      <EnTete titre="Paramètres" retour="/reglages" />
      <div className="contenu">
        <h2 className="titre-section">En-tête des documents</h2>
        <div className="carte">
          {TEXTES.map(([champ, libelle]) => (
            <label className="champ" key={champ}><span>{libelle}</span>
              <input defaultValue={p[champ] as string} onBlur={(e) => e.target.value !== p[champ] && changer(champ, e.target.value.trim())} />
            </label>
          ))}
        </div>
        <h2 className="titre-section">Semestres</h2>
        <div className="carte">
          {DATES.map(([champ, libelle]) => (
            <label className="champ" key={champ}><span>{libelle}</span>
              <input type="date" value={p[champ] as string} onChange={(e) => e.target.value && changer(champ, e.target.value)} />
            </label>
          ))}
        </div>
      </div>
    </>
  );
}

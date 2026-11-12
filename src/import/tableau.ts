import { normaliser } from '../domaine/texte';

export interface EleveBrouillon { numero: number; nom: string; prenom: string }
export interface Correspondance { ligneEntetes: number; numero: number | null; nom: number | null; prenom: number | null; nomComplet: number | null }

const EN_TETES = {
  numero: ['n', 'no', 'num', 'numero', 'n ordre', 'no ordre', 'numero ordre', 'numero d ordre', 'n d ordre', 'ordre', 'رقم', 'الرقم', 'ر ت', 'رت', 'الرقم الترتيبي'],
  nom: ['nom', 'nom de famille', 'النسب', 'الاسم العائلي'],
  prenom: ['prenom', 'prenoms', 'الاسم', 'الاسم الشخصي'],
  nomComplet: ['nom et prenom', 'nom prenom', 'nom complet', 'prenom et nom', 'noms et prenoms', 'eleve', 'eleves', 'الاسم الكامل', 'الاسم والنسب', 'الاسم و النسب'],
};

function colonne(ligne: string[], noms: string[]): number | null {
  const i = ligne.findIndex((c) => noms.includes(normaliser(String(c ?? ''))));
  return i === -1 ? null : i;
}

/** Cherche la ligne d'en-têtes parmi les 30 premières : la première qui contient une colonne de nom. */
export function detecterColonnes(lignes: string[][]): Correspondance | null {
  for (let i = 0; i < Math.min(lignes.length, 30); i++) {
    const ligne = lignes[i] ?? [];
    const nom = colonne(ligne, EN_TETES.nom);
    const nomComplet = colonne(ligne, EN_TETES.nomComplet);
    if (nom === null && nomComplet === null) continue;
    return { ligneEntetes: i, numero: colonne(ligne, EN_TETES.numero), nom, prenom: colonne(ligne, EN_TETES.prenom), nomComplet };
  }
  return null;
}

/** « EL AMRANI Mohamed Yassine » -> nom « EL AMRANI », prénom « Mohamed Yassine ». Sans majuscules distinctives : premier mot = nom. */
export function separerNomPrenom(complet: string): { nom: string; prenom: string } {
  const mots = complet.trim().split(/\s+/).filter(Boolean);
  if (mots.length <= 1) return { nom: mots[0] ?? '', prenom: '' };
  const estMajuscule = (m: string) => /\p{Lu}/u.test(m) && m === m.toUpperCase();
  let n = 0;
  while (n < mots.length && estMajuscule(mots[n])) n++;
  if (n === 0 || n === mots.length) n = 1;
  return { nom: mots.slice(0, n).join(' '), prenom: mots.slice(n).join(' ') };
}

export function depuisTableau(lignes: string[][], c: Correspondance): EleveBrouillon[] {
  const eleves: EleveBrouillon[] = [];
  const cellule = (ligne: string[], i: number | null) => (i === null ? '' : String(ligne[i] ?? '').trim());
  for (const ligne of lignes.slice(c.ligneEntetes + 1)) {
    let nom = cellule(ligne, c.nom);
    let prenom = cellule(ligne, c.prenom);
    if (!nom && c.nomComplet !== null) ({ nom, prenom } = separerNomPrenom(cellule(ligne, c.nomComplet)));
    if (!nom) continue;
    const lu = Number(cellule(ligne, c.numero).replace(',', '.'));
    const numero = Number.isInteger(lu) && lu > 0 ? lu : (eleves.at(-1)?.numero ?? 0) + 1;
    eleves.push({ numero, nom, prenom });
  }
  return eleves;
}

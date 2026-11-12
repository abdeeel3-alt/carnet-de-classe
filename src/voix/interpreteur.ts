import { distance, normaliser } from '../domaine/texte';
import type { Eleve, TypeObservation } from '../domaine/types';

export type Resultat =
  /** `ignores` : mots et nombres entendus qui n'ont désigné personne, à montrer au professeur. */
  | { sorte: 'action'; eleveIds: string[]; typeId: string; ignores: string[] }
  | { sorte: 'choix'; texte: string; eleves: { entendu: string; candidats: string[] }[]; eleveIds: string[]; types: string[]; ignores: string[] }
  | { sorte: 'incompris'; texte: string };

const MOTS_VIDES = new Set([
  'numero', 'numeros', 'n', 'no', 'le', 'la', 'les', 'l', 'et', 'pour', 'a', 'est', 'sont', 'eleve', 'eleves',
  'un', 'une', 'de', 'des', 'du', 'd', 'au', 'aux', 'avec', 'alors', 'donc', 'puis', 'aussi', 'ont', 'en',
  'sans', 'pas', 'plus', 'moins', 'tres', 'encore', 'fois', 'minute', 'minutes', 'il', 'elle', 'ils', 'elles', 'qui', 'que', 'y', 'ce', 'cet', 'cette',
]);
const UNITES: Record<string, number> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16,
};
const DIZAINES: Record<string, number> = { vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60 };
const INTRODUIT_UN_NUMERO = new Set(['numero', 'numeros', 'n', 'no']);

/** Remplace les nombres écrits en lettres (un à soixante-neuf) par des chiffres. « un » seul n'est un numéro qu'après « numéro » ou dans une liste de numéros. */
function chiffrer(mots: string[]): string[] {
  const sortie: string[] = [];
  const estNombre = (m: string | undefined) => m !== undefined && /^\d+$/.test(m);
  for (let i = 0; i < mots.length; i++) {
    const m = mots[i];
    const suivant = mots[i + 1];
    if (m in DIZAINES) {
      let v = DIZAINES[m];
      if (suivant === 'et' && (mots[i + 2] === 'un' || mots[i + 2] === 'une')) { v += 1; i += 2; }
      else if (suivant in UNITES && UNITES[suivant] <= 9) { v += UNITES[suivant]; i += 1; }
      sortie.push(String(v));
    } else if (m === 'dix' && (suivant === 'sept' || suivant === 'huit' || suivant === 'neuf')) {
      sortie.push(String(10 + UNITES[suivant]));
      i += 1;
    } else if (m === 'un' || m === 'une') {
      const avant = sortie.at(-1);
      const apresNumero = avant !== undefined && INTRODUIT_UN_NUMERO.has(avant);
      const dansUneListe = estNombre(avant) || (avant === 'et' && estNombre(sortie.at(-2)));
      sortie.push(apresNumero || dansUneListe ? '1' : m);
    } else if (m in UNITES) {
      sortie.push(String(UNITES[m]));
    } else {
      sortie.push(m);
    }
  }
  return sortie;
}

interface Formes { id: string; exactes: Set<string>; mots: Set<string> }

function formes(e: Eleve): Formes {
  const prenom = normaliser(e.prenom);
  const nom = normaliser(e.nom);
  const mots = new Set([...prenom.split(' '), ...nom.split(' ')].filter((m) => m.length >= 3));
  const exactes = new Set([prenom, nom, `${prenom} ${nom}`, `${nom} ${prenom}`, ...mots].filter(Boolean));
  for (const p of prenom.split(' ')) for (const n of [nom, ...nom.split(' ')]) { exactes.add(`${p} ${n}`); exactes.add(`${n} ${p}`); }
  return { id: e.id, exactes, mots };
}

/** Cherche l'observation dite : le libellé ou synonyme le plus long présent en mots entiers. */
function trouverObservation(texte: string, types: TypeObservation[]): { ids: string[]; reste: string } | null {
  const borde = ` ${texte} `;
  let meilleur = 0;
  let ids: string[] = [];
  let expression = '';
  for (const t of types) {
    if (t.deleted || t.masque) continue;
    for (const brut of [t.libelle, ...(t.synonymes ?? [])]) {
      const e = normaliser(brut);
      if (!e || !borde.includes(` ${e} `)) continue;
      if (e.length > meilleur) { meilleur = e.length; ids = [t.id]; expression = e; }
      else if (e.length === meilleur && !ids.includes(t.id)) ids.push(t.id);
    }
  }
  if (!ids.length) return null;
  return { ids, reste: borde.replace(` ${expression} `, ' ').trim() };
}

export function interpreter(texte: string, eleves: Eleve[], types: TypeObservation[]): Resultat {
  const incompris: Resultat = { sorte: 'incompris', texte };
  const observation = trouverObservation(chiffrerTexte(normaliser(texte)), types);
  if (!observation) return incompris;

  const classe = eleves.filter((e) => !e.deleted);
  const toutes = classe.map(formes);
  const mots = observation.reste.split(' ').filter(Boolean);

  const estNombre = (m: string) => /^\d+$/.test(m);
  // Un nombre nu ne désigne un élève que si la phrase ne nomme personne (« absents 4, 17 et 23 ») ;
  // sinon il faut l'avoir annoncé par « numéro » (« Omar en retard de dix minutes » ne vise pas le n° 10).
  const sansNom = mots.every((m) => estNombre(m) || MOTS_VIDES.has(m));

  const surs: string[] = [];
  const ambigus: { entendu: string; candidats: string[] }[] = [];
  const ignores: string[] = [];
  const ajouter = (id: string) => { if (!surs.includes(id)) surs.push(id); };
  let apresNumero = false;

  for (let i = 0; i < mots.length; ) {
    const m = mots[i];
    if (estNombre(m)) {
      if (!sansNom && !apresNumero) { ignores.push(m); i += 1; continue; }
      const candidats = classe.filter((x) => x.numero === Number(m)).map((x) => x.id);
      if (!candidats.length) return incompris;
      if (candidats.length === 1) ajouter(candidats[0]);
      else ambigus.push({ entendu: m, candidats });
      i += 1;
      continue;
    }
    if (INTRODUIT_UN_NUMERO.has(m)) { apresNumero = true; i += 1; continue; }
    if (m !== 'et') apresNumero = false;

    // Plus longue suite de mots qui désigne exactement au moins un élève.
    let trouve = false;
    for (let longueur = Math.min(4, mots.length - i); longueur >= 1 && !trouve; longueur--) {
      const suite = mots.slice(i, i + longueur);
      if (suite.some(estNombre)) continue;
      if (longueur === 1 && MOTS_VIDES.has(m)) break;
      const entendu = suite.join(' ');
      const candidats = toutes.filter((f) => f.exactes.has(entendu)).map((f) => f.id);
      if (!candidats.length) continue;
      if (candidats.length === 1) ajouter(candidats[0]);
      else ambigus.push({ entendu, candidats });
      i += longueur;
      trouve = true;
    }
    if (trouve) continue;
    if (!MOTS_VIDES.has(m)) {
      // Mot proche d'un prénom ou d'un nom : jamais appliqué d'office, toujours proposé.
      const tolerance = m.length >= 7 ? 2 : m.length >= 4 ? 1 : 0;
      let min = tolerance + 1;
      let candidats: string[] = [];
      for (const f of toutes) {
        const d = Math.min(...[...f.mots].map((x) => distance(m, x)), Infinity);
        if (d < min) { min = d; candidats = [f.id]; }
        else if (d === min && d <= tolerance) candidats.push(f.id);
      }
      if (tolerance && candidats.length) ambigus.push({ entendu: m, candidats });
      else ignores.push(m);
    }
    i += 1;
  }

  if (!surs.length && !ambigus.length) return incompris;
  if (!ambigus.length && observation.ids.length === 1) return { sorte: 'action', eleveIds: surs, typeId: observation.ids[0], ignores };
  return { sorte: 'choix', texte, eleves: ambigus, eleveIds: surs, types: observation.ids, ignores };
}

function chiffrerTexte(normalise: string): string {
  return chiffrer(normalise.split(' ').filter(Boolean)).join(' ');
}

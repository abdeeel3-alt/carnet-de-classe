import { separerNomPrenom, type EleveBrouillon } from './tableau';

/** Un élève par ligne : numéro facultatif en tête, puis nom et prénom. Les lignes sans lettres sont ignorées. */
export function depuisTexte(texte: string): EleveBrouillon[] {
  const eleves: EleveBrouillon[] = [];
  for (const brute of (texte ?? '').split(/\r?\n/)) {
    const m = /^\s*(\d{1,3})?[\s.)\-:|]*(.*)$/.exec(brute)!;
    const reste = m[2].replace(/[|;,\t]+/g, ' ').trim();
    if (!/\p{L}/u.test(reste)) continue;
    const numero = m[1] ? Number(m[1]) : (eleves.at(-1)?.numero ?? 0) + 1;
    eleves.push({ numero, ...separerNomPrenom(reste) });
  }
  return eleves;
}

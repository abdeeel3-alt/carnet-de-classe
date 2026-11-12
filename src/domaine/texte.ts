/** Minuscules, sans accents, ponctuation remplacée par des espaces, espaces réduits. */
export function normaliser(s: string): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/(\p{L})(\p{N})/gu, '$1 $2')
    .replace(/(\p{N})(\p{L})/gu, '$1 $2')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Distance de Levenshtein. */
export function distance(a: string, b: string): number {
  if (a === b) return 0;
  let precedente = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const courante = [i];
    for (let j = 1; j <= b.length; j++) {
      courante[j] = Math.min(precedente[j] + 1, courante[j - 1] + 1, precedente[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    precedente = courante;
  }
  return precedente[b.length];
}

/** Nombre avec son signe : « +2 », « −1 » (vrai signe moins), « 0 ». */
export function signe(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0';
}

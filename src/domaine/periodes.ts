import type { Parametres, PeriodeRegle } from './types';

export type ChoixPeriode =
  | { type: 'semaine' | 'mois' | 'semestre1' | 'semestre2' | 'annee' }
  | { type: 'dates'; debut: string; fin: string };

/** Bornes incluses : début à 00:00:00.000, fin à 23:59:59.999, en heure locale. */
export interface Intervalle { debut: Date; fin: Date }

const debutJour = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const finJour = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

/** 'AAAA-MM-JJ' -> date locale à minuit. Une chaîne invalide donne la date du jour. */
export function dateLocale(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!m) return debutJour(new Date());
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function versIsoJour(d: Date): string {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

function lundi(d: Date): Date {
  const j = (d.getDay() + 6) % 7; // lundi = 0
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - j);
}

function semaine(d: Date): Intervalle {
  const l = lundi(d);
  return { debut: l, fin: finJour(new Date(l.getFullYear(), l.getMonth(), l.getDate() + 6)) };
}

function mois(d: Date): Intervalle {
  return { debut: new Date(d.getFullYear(), d.getMonth(), 1), fin: finJour(new Date(d.getFullYear(), d.getMonth() + 1, 0)) };
}

function semestre(n: 1 | 2, p: Parametres): Intervalle {
  return n === 1
    ? { debut: dateLocale(p.semestre1_debut), fin: finJour(dateLocale(p.semestre1_fin)) }
    : { debut: dateLocale(p.semestre2_debut), fin: finJour(dateLocale(p.semestre2_fin)) };
}

function numeroSemestre(d: Date, p: Parametres): 1 | 2 {
  const s1 = semestre(1, p);
  const s2 = semestre(2, p);
  const t = d.getTime();
  if (t >= s1.debut.getTime() && t <= s1.fin.getTime()) return 1;
  if (t >= s2.debut.getTime() && t <= s2.fin.getTime()) return 2;
  const ecart = (i: Intervalle) => Math.min(Math.abs(t - i.debut.getTime()), Math.abs(t - i.fin.getTime()));
  return ecart(s1) <= ecart(s2) ? 1 : 2;
}

export function resoudrePeriode(choix: ChoixPeriode, aujourdHui: Date, p: Parametres): Intervalle {
  switch (choix.type) {
    case 'semaine': return semaine(aujourdHui);
    case 'mois': return mois(aujourdHui);
    case 'semestre1': return semestre(1, p);
    case 'semestre2': return semestre(2, p);
    case 'annee': return { debut: semestre(1, p).debut, fin: semestre(2, p).fin };
    case 'dates': {
      const a = dateLocale(choix.debut);
      const b = dateLocale(choix.fin);
      return a <= b ? { debut: a, fin: finJour(b) } : { debut: b, fin: finJour(a) };
    }
  }
}

export function intervalleRegle(periode: PeriodeRegle, date: Date, p: Parametres): Intervalle {
  if (periode === 'semaine') return semaine(date);
  if (periode === 'mois') return mois(date);
  return semestre(numeroSemestre(date, p), p);
}

/** Semaine ISO : la semaine 1 est celle du premier jeudi de l'année. */
function semaineIso(d: Date): { annee: number; semaine: number } {
  const l = lundi(d);
  const jeudi = new Date(l.getFullYear(), l.getMonth(), l.getDate() + 3);
  const annee = jeudi.getFullYear();
  const premierLundi = lundi(new Date(annee, 0, 4));
  const semaine = Math.round((l.getTime() - premierLundi.getTime()) / (7 * 86400000)) + 1;
  return { annee, semaine };
}

export function clePeriode(periode: PeriodeRegle, date: Date, p: Parametres): string {
  if (periode === 'semaine') {
    const { annee, semaine: s } = semaineIso(date);
    return `${annee}-S${String(s).padStart(2, '0')}`;
  }
  if (periode === 'mois') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return `semestre${numeroSemestre(date, p)}`;
}

export function dansIntervalle(iso: string, i: Intervalle): boolean {
  const t = new Date(iso).getTime();
  return t >= i.debut.getTime() && t <= i.fin.getTime();
}

export function libellePeriode(i: Intervalle): string {
  const f = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `du ${f(i.debut)} au ${f(i.fin)}`;
}

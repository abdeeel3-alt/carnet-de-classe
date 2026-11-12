import ExcelJS from 'exceljs';
import { JOURS } from '../domaine/emploiDuTemps';
import { totauxVides, type Totaux } from '../domaine/points';
import { CRITERES, NOM_CRITERE, TABLES, type Attribution, type Classe, type Creneau, type Eleve, type NomTable, type Observation, type Seance } from '../domaine/types';
import type { DonneesFiche } from '../ecrans/eleve/donneesFiche';
import {
  ajusterLargeurs, BORDURE, cellulePoints, COULEURS, creerFeuille, fond, ligneDonnees, ligneMessage, ligneTotal, titresColonnes,
  type Colonne, type EnTeteDoc,
} from './styles';

export type { EnTeteDoc } from './styles';

/** Première ligne libre sous le bandeau et l'en-tête. */
const L = 5;
const jourMois = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
const jourComplet = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const parNumero = (eleves: Eleve[]) => [...eleves].sort((a, b) => a.numero - b.numero);

export function listeDeClasse(e: EnTeteDoc, eleves: Eleve[]): ExcelJS.Workbook {
  const classeur = new ExcelJS.Workbook();
  const colonnes: Colonne[] = [
    { titre: 'N°', centre: true }, { titre: 'Nom' }, { titre: 'Prénom' },
    ...Array.from({ length: 8 }, () => ({ titre: '', largeur: 7 })),
  ];
  const f = creerFeuille(classeur, 'Liste', { ...e, titre: 'Liste de classe' }, 'portrait', colonnes.length);
  titresColonnes(f, L, colonnes);
  parNumero(eleves).forEach((el, i) => {
    ligneDonnees(f, L + 1 + i, [el.numero, el.nom, el.prenom, ...Array(8).fill(null)], colonnes, i % 2 === 1).height = 20;
  });
  if (!eleves.length) ligneMessage(f, L + 1, 'Aucun élève', colonnes.length);
  ajusterLargeurs(f, L, colonnes);
  return classeur;
}

export function registrePresence(e: EnTeteDoc, eleves: Eleve[], seances: Seance[], obs: Observation[]): ExcelJS.Workbook {
  const classeur = new ExcelJS.Workbook();
  const triees = [...seances].sort((a, b) => a.debut.localeCompare(b.debut));
  const colonnes: Colonne[] = [
    { titre: 'N°', centre: true }, { titre: 'Nom et prénom' },
    ...triees.map((s) => ({ titre: jourMois(s.debut), centre: true, largeur: 6.5 })),
    { titre: 'Total A', centre: true, couleur: COULEURS.negatif }, { titre: 'Total R', centre: true, couleur: COULEURS.retard },
  ];
  const f = creerFeuille(classeur, 'Présence', { ...e, titre: 'Registre de présence' }, 'landscape', colonnes.length);
  titresColonnes(f, L, colonnes);
  const code = new Map<string, 'absent' | 'retard'>();
  for (const o of obs) if (!o.deleted && o.code) code.set(`${o.eleve_id}|${o.seance_id}`, o.code);

  parNumero(eleves).forEach((el, i) => {
    const marques = triees.map((s) => code.get(`${el.id}|${s.id}`));
    const absences = marques.filter((m) => m === 'absent').length;
    const retards = marques.filter((m) => m === 'retard').length;
    const rangee = ligneDonnees(f, L + 1 + i,
      [el.numero, `${el.nom} ${el.prenom}`.trim(), ...marques.map((m) => (m === 'absent' ? 'A' : m === 'retard' ? 'R' : null)), absences, retards],
      colonnes, i % 2 === 1);
    marques.forEach((m, j) => {
      if (!m) return;
      const c = rangee.getCell(3 + j);
      c.fill = fond(m === 'absent' ? COULEURS.fondNegatif : COULEURS.fondRetard);
      c.font = { bold: true, color: { argb: m === 'absent' ? COULEURS.negatif : COULEURS.retard } };
    });
    rangee.getCell(colonnes.length - 1).font = { bold: true, color: { argb: absences ? COULEURS.negatif : COULEURS.texte } };
    rangee.getCell(colonnes.length).font = { bold: true, color: { argb: retards ? COULEURS.retard : COULEURS.texte } };
  });
  if (!eleves.length) ligneMessage(f, L + 1, 'Aucun élève', colonnes.length);
  else if (!triees.length) ligneMessage(f, L + 1 + eleves.length, 'Aucune séance sur cette période', colonnes.length);
  const legende = f.getCell(f.rowCount + 2, 1);
  legende.value = 'A : absent   ·   R : retard';
  legende.font = { italic: true, size: 9, color: { argb: COULEURS.doux } };
  ajusterLargeurs(f, L, colonnes);
  return classeur;
}

export function bilanComportement(e: EnTeteDoc, eleves: Eleve[], totaux: Map<string, Totaux>, attributions: Attribution[]): ExcelJS.Workbook {
  const classeur = new ExcelJS.Workbook();
  const colonnes: Colonne[] = [
    { titre: 'N°', centre: true }, { titre: 'Nom' }, { titre: 'Prénom' },
    ...CRITERES.map((c) => ({ titre: NOM_CRITERE[c], couleur: COULEURS[c], centre: true })),
    { titre: 'Total', couleur: COULEURS.bandeau, centre: true },
    { titre: 'Absences', couleur: COULEURS.negatif, centre: true }, { titre: 'Retards', couleur: COULEURS.retard, centre: true },
    { titre: 'Badges', couleur: COULEURS.positif }, { titre: 'Sanctions', couleur: COULEURS.negatif },
  ];
  const f = creerFeuille(classeur, 'Bilan', { ...e, titre: 'Bilan de comportement' }, 'landscape', colonnes.length);
  titresColonnes(f, L, colonnes);
  const validees = attributions.filter((a) => !a.deleted && a.etat === 'validee');
  const libelles = (eleveId: string, type: Attribution['type']) => validees.filter((a) => a.eleve_id === eleveId && a.type === type).map((a) => a.libelle).join(', ');
  const tries = parNumero(eleves);
  const sommes = Array<number>(8).fill(0);

  tries.forEach((el, i) => {
    const t = totaux.get(el.id) ?? totauxVides();
    const points = [...CRITERES.map((c) => t.parCritere[c]), t.total];
    const rangee = ligneDonnees(f, L + 1 + i,
      [el.numero, el.nom, el.prenom, ...points, t.absences, t.retards, libelles(el.id, 'badge') || null, libelles(el.id, 'sanction') || null],
      colonnes, i % 2 === 1);
    points.forEach((p, j) => cellulePoints(rangee.getCell(4 + j), p));
    if (t.absences) rangee.getCell(10).font = { bold: true, color: { argb: COULEURS.negatif } };
    if (t.retards) rangee.getCell(11).font = { bold: true, color: { argb: COULEURS.retard } };
    rangee.getCell(12).font = { color: { argb: COULEURS.positif } };
    rangee.getCell(13).font = { color: { argb: COULEURS.negatif } };
    [...points, t.absences, t.retards].forEach((v, j) => { sommes[j] += v; });
  });

  if (!tries.length) {
    ligneMessage(f, L + 1, 'Aucun élève', colonnes.length);
  } else {
    const n = L + 1 + tries.length;
    const rangee = ligneDonnees(f, n, ['Moyenne de la classe', null, null, ...sommes.map((s) => Math.round((s / tries.length) * 10) / 10), null, null], colonnes, false);
    f.mergeCells(n, 1, n, 3);
    for (let j = 0; j < 6; j++) rangee.getCell(4 + j).numFmt = '+0.0;−0.0;0';
    for (let j = 6; j < 8; j++) rangee.getCell(4 + j).numFmt = '0.0';
    ligneTotal(rangee, colonnes.length);
  }
  ajusterLargeurs(f, L, colonnes);
  return classeur;
}

export function ficheEleve(e: EnTeteDoc, d: DonneesFiche): ExcelJS.Workbook {
  const classeur = new ExcelJS.Workbook();
  const colonnes: Colonne[] = [{ titre: 'Date', centre: true, largeur: 14 }, { titre: 'Critère', largeur: 16 }, { titre: 'Observation', largeur: 44 }, { titre: 'Points', centre: true, largeur: 10 }];
  const { eleve, totaux } = d;
  const f = creerFeuille(classeur, 'Fiche', { ...e, titre: `Fiche élève — ${`${eleve.nom} ${eleve.prenom}`.trim()} (n° ${eleve.numero})` }, 'portrait', colonnes.length);

  // Bloc de synthèse : libellé en colonne 1, valeur en colonne 2.
  let n = L + 1;
  const synthese = (libelle: string, couleur: string) => {
    const a = f.getCell(n, 1);
    a.value = libelle;
    a.font = { bold: true, color: { argb: COULEURS.blanc } };
    a.fill = fond(couleur);
    a.border = BORDURE;
    const b = f.getCell(n, 2);
    b.border = BORDURE;
    b.alignment = { horizontal: 'center', vertical: 'middle' };
    n += 1;
    return b;
  };
  for (const c of CRITERES) cellulePoints(synthese(NOM_CRITERE[c], COULEURS[c]), totaux.parCritere[c]);
  const total = synthese('Total', COULEURS.bandeau);
  cellulePoints(total, totaux.total);
  total.fill = fond(COULEURS.total);
  synthese('Absences', COULEURS.negatif).value = totaux.absences;
  synthese('Retards', COULEURS.retard).value = totaux.retards;

  const texteLong = (libelle: string, couleur: string, texte: string) => {
    const b = synthese(libelle, couleur);
    f.mergeCells(n - 1, 2, n - 1, colonnes.length);
    b.value = texte || '—';
    b.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    if (texte.length > 70) f.getRow(n - 1).height = 15 * Math.ceil(texte.length / 70);
  };
  const noms = (type: Attribution['type']) => d.attributions.filter((a) => a.type === type).map((a) => `${a.libelle} (${jourComplet(a.date)})`).join(', ');
  texteLong('Badges', COULEURS.positif, noms('badge'));
  texteLong('Sanctions', COULEURS.negatif, noms('sanction'));
  texteLong('Remarques', COULEURS.titres, eleve.remarques ?? '');

  const titres = n + 1;
  titresColonnes(f, titres, colonnes);
  d.observations.forEach((o, i) => {
    const rangee = ligneDonnees(f, titres + 1 + i, [jourComplet(o.horodatage), NOM_CRITERE[o.critere], o.libelle, o.points], colonnes, i % 2 === 1);
    rangee.getCell(2).font = { bold: true, color: { argb: COULEURS[o.critere] } };
    cellulePoints(rangee.getCell(4), o.points);
  });
  if (!d.observations.length) ligneMessage(f, titres + 1, 'Aucune observation sur cette période', colonnes.length);
  ajusterLargeurs(f, titres, colonnes);
  return classeur;
}

export function emploiDuTemps(e: EnTeteDoc, creneaux: Creneau[], classes: Classe[]): ExcelJS.Workbook {
  const classeur = new ExcelJS.Workbook();
  const colonnes: Colonne[] = [{ titre: 'Horaire', centre: true, largeur: 16 }, ...JOURS.map((j) => ({ titre: j.nom, centre: true, largeur: 20, couleur: COULEURS.bandeau }))];
  const f = creerFeuille(classeur, 'Emploi du temps', { ...e, classe: '', periode: '', titre: 'Emploi du temps' }, 'landscape', colonnes.length);
  titresColonnes(f, L, colonnes);
  const actifs = creneaux.filter((c) => !c.deleted);
  const horaires = [...new Set(actifs.map((c) => `${c.debut} – ${c.fin}`))].sort();
  const nom = (id: string) => classes.find((c) => c.id === id)?.nom ?? '—';
  horaires.forEach((h, i) => {
    const cases = JOURS.map((j) => {
      const c = actifs.find((x) => x.jour === j.jour && `${x.debut} – ${x.fin}` === h);
      return c ? `${nom(c.classe_id)}${c.salle ? `\nSalle ${c.salle}` : ''}` : null;
    });
    const rangee = ligneDonnees(f, L + 1 + i, [h, ...cases], colonnes, false);
    rangee.height = 36;
    rangee.getCell(1).font = { bold: true };
    rangee.getCell(1).fill = fond(COULEURS.alterne);
    cases.forEach((c, j) => {
      if (!c) return;
      rangee.getCell(2 + j).fill = fond(COULEURS.total);
      rangee.getCell(2 + j).font = { bold: true, color: { argb: COULEURS.bandeau } };
      rangee.getCell(2 + j).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });
  });
  if (!horaires.length) ligneMessage(f, L + 1, 'Aucun créneau', colonnes.length);
  ajusterLargeurs(f, L, colonnes);
  return classeur;
}

/** Toutes les données, brutes, une feuille par table : pour l'archivage, pas pour l'impression. */
export function sauvegardeComplete(tables: Record<NomTable, object[]>): ExcelJS.Workbook {
  const classeur = new ExcelJS.Workbook();
  for (const table of TABLES) {
    const f = classeur.addWorksheet(table);
    const lignes = tables[table] as Record<string, unknown>[];
    const champs = [...new Set(lignes.flatMap((l) => Object.keys(l)))];
    if (!champs.length) continue;
    f.addRow(champs).font = { bold: true };
    for (const l of lignes) {
      f.addRow(champs.map((c) => {
        const v = l[c];
        return v === null || v === undefined ? null : typeof v === 'object' ? JSON.stringify(v) : (v as string | number | boolean);
      }));
    }
  }
  return classeur;
}

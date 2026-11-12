import type ExcelJS from 'exceljs';

/** Couleurs des exports (ARGB). Les critères reprennent les couleurs de l'application. */
export const COULEURS = {
  bandeau: 'FF1E3A8A', titres: 'FF334155', blanc: 'FFFFFFFF', texte: 'FF0F172A', doux: 'FF475569',
  presence: 'FF475569', reglement: 'FF7C3AED', participation: 'FF16A34A', discipline: 'FFDC2626', serieux: 'FF2563EB',
  positif: 'FF15803D', negatif: 'FFB91C1C', retard: 'FFC2410C',
  fondPositif: 'FFDCFCE7', fondNegatif: 'FFFEE2E2', fondRetard: 'FFFFEDD5',
  alterne: 'FFF1F5F9', total: 'FFDBEAFE', bord: 'FF94A3B8',
} as const;

export const FORMAT_POINTS = '+0;−0;0';

export interface EnTeteDoc { etablissement: string; professeur: string; matiere: string; classe: string; annee: string; periode: string; titre: string }
export interface Colonne { titre: string; couleur?: string; centre?: boolean; largeur?: number }

const fin: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: COULEURS.bord } };
export const BORDURE: Partial<ExcelJS.Borders> = { top: fin, left: fin, bottom: fin, right: fin };
export const fond = (argb: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

/** Crée la feuille A4 et pose le bandeau de titre et les trois lignes d'en-tête. La ligne suivante libre est la 5. */
export function creerFeuille(classeur: ExcelJS.Workbook, nom: string, enTete: EnTeteDoc, orientation: 'portrait' | 'landscape', nombreColonnes: number): ExcelJS.Worksheet {
  const f = classeur.addWorksheet(nom, {
    pageSetup: {
      paperSize: 9, orientation, fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true,
      margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.6, header: 0.3, footer: 0.3 },
    },
  });
  const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  f.headerFooter.oddFooter = `&L&8Édité le ${date}&R&8Page &P / &N`;

  const lignes: [string, Partial<ExcelJS.Font>][] = [
    [enTete.titre, { bold: true, size: 15, color: { argb: COULEURS.blanc } }],
    [enTete.etablissement || 'Établissement', { bold: true, size: 11, color: { argb: COULEURS.texte } }],
    [`Professeur : ${enTete.professeur || '—'}   ·   Matière : ${enTete.matiere || '—'}`, { size: 10, color: { argb: COULEURS.doux } }],
    [[enTete.classe && `Classe : ${enTete.classe}`, enTete.annee && `Année scolaire : ${enTete.annee}`, enTete.periode && `Période : ${enTete.periode}`].filter(Boolean).join('   ·   '),
      { size: 10, color: { argb: COULEURS.doux } }],
  ];
  lignes.forEach(([texte, police], i) => {
    const n = i + 1;
    if (nombreColonnes > 1) f.mergeCells(n, 1, n, nombreColonnes);
    const c = f.getCell(n, 1);
    c.value = texte;
    c.font = police;
    c.alignment = { vertical: 'middle', horizontal: n === 1 ? 'center' : 'left' };
  });
  f.getCell(1, 1).fill = fond(COULEURS.bandeau);
  f.getRow(1).height = 30;
  return f;
}

/** Écrit la ligne de titres de colonnes : gras, blanc sur couleur, répétée en haut de chaque page imprimée. */
export function titresColonnes(f: ExcelJS.Worksheet, ligne: number, colonnes: Colonne[]): void {
  const rangee = f.getRow(ligne);
  colonnes.forEach((col, i) => {
    const c = rangee.getCell(i + 1);
    c.value = col.titre;
    c.font = { bold: true, color: { argb: COULEURS.blanc } };
    c.fill = fond(col.couleur ?? COULEURS.titres);
    c.border = BORDURE;
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  rangee.height = 24;
  f.pageSetup.printTitlesRow = `${ligne}:${ligne}`;
}

/** Écrit une ligne de données bordée ; une ligne sur deux est teintée (les cellules déjà colorées gardent leur couleur). */
export function ligneDonnees(f: ExcelJS.Worksheet, ligne: number, valeurs: (string | number | null)[], colonnes: Colonne[], alternee: boolean): ExcelJS.Row {
  const rangee = f.getRow(ligne);
  valeurs.forEach((v, i) => {
    const c = rangee.getCell(i + 1);
    c.value = v;
    c.border = BORDURE;
    c.alignment = { vertical: 'middle', horizontal: colonnes[i]?.centre ? 'center' : 'left', wrapText: typeof v === 'string' && v.includes('\n') };
    if (alternee) c.fill = fond(COULEURS.alterne);
  });
  return rangee;
}

/** Met en forme une cellule de points : le signe est écrit, la couleur le double. */
export function cellulePoints(c: ExcelJS.Cell, valeur: number): void {
  c.value = valeur;
  c.numFmt = FORMAT_POINTS;
  c.alignment = { vertical: 'middle', horizontal: 'center' };
  if (valeur !== 0) c.font = { bold: true, color: { argb: valeur > 0 ? COULEURS.positif : COULEURS.negatif } };
}

/** Ligne de totaux ou de moyennes : gras sur fond soutenu. */
export function ligneTotal(rangee: ExcelJS.Row, nombreColonnes: number): void {
  for (let i = 1; i <= nombreColonnes; i++) {
    const c = rangee.getCell(i);
    c.fill = fond(COULEURS.total);
    c.font = { ...(c.font ?? {}), bold: true };
    c.border = BORDURE;
  }
}

/** Une ligne fusionnée sur toute la largeur, pour un message comme « Aucun élève ». */
export function ligneMessage(f: ExcelJS.Worksheet, ligne: number, texte: string, nombreColonnes: number): void {
  if (nombreColonnes > 1) f.mergeCells(ligne, 1, ligne, nombreColonnes);
  const c = f.getCell(ligne, 1);
  c.value = texte;
  c.border = BORDURE;
  c.font = { italic: true, color: { argb: COULEURS.doux } };
  c.alignment = { horizontal: 'center', vertical: 'middle' };
}

/** Largeurs d'après le contenu le plus long à partir de la ligne donnée, bornées entre 4 et 32 caractères. */
export function ajusterLargeurs(f: ExcelJS.Worksheet, depuisLigne: number, colonnes: Colonne[]): void {
  colonnes.forEach((col, i) => {
    if (col.largeur) { f.getColumn(i + 1).width = col.largeur; return; }
    let max = 0;
    for (let n = depuisLigne; n <= f.rowCount; n++) {
      const c = f.getRow(n).getCell(i + 1);
      if (c.isMerged && c.master !== c) continue;
      const texte = c.value === null || c.value === undefined ? '' : String(c.value);
      max = Math.max(max, ...texte.split('\n').map((t) => t.length));
    }
    f.getColumn(i + 1).width = Math.min(32, Math.max(4, max + 2));
  });
}

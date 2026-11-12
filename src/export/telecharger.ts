import type ExcelJS from 'exceljs';

/** Propose le classeur en téléchargement. */
export async function telecharger(classeur: ExcelJS.Workbook, nomFichier: string): Promise<void> {
  const octets = await classeur.xlsx.writeBuffer();
  const blob = new Blob([octets], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

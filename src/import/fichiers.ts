/** Lit la première feuille d'un fichier .xlsx, .xls ou .csv en lignes de texte. */
export async function lireTableur(fichier: File): Promise<string[][]> {
  const XLSX = await import('xlsx');
  const classeur = XLSX.read(await enOctets(fichier), { type: 'array' });
  const feuille = classeur.Sheets[classeur.SheetNames[0]];
  if (!feuille) return [];
  const lignes = XLSX.utils.sheet_to_json<unknown[]>(feuille, { header: 1, raw: false, defval: '' });
  return lignes.map((l) => l.map((c) => String(c ?? '').trim()));
}

/** Lit le texte d'une photo de liste. A besoin d'Internet pour charger le moteur de reconnaissance. */
export async function lireImage(fichier: File): Promise<string> {
  const { recognize } = await import('tesseract.js');
  const { data } = await recognize(fichier, 'fra');
  return data.text;
}

function enOctets(fichier: File): Promise<ArrayBuffer> {
  if (typeof fichier.arrayBuffer === 'function') return fichier.arrayBuffer();
  return new Promise((resoudre, rejeter) => {
    const lecteur = new FileReader();
    lecteur.onload = () => resoudre(lecteur.result as ArrayBuffer);
    lecteur.onerror = () => rejeter(lecteur.error);
    lecteur.readAsArrayBuffer(fichier);
  });
}

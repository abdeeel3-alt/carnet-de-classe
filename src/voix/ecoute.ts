/** Enveloppe de la reconnaissance vocale du navigateur (Chrome : webkitSpeechRecognition). A besoin d'Internet. */

interface Reconnaissance {
  lang: string; interimResults: boolean; maxAlternatives: number; continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; abort(): void;
}

function constructeur(): (new () => Reconnaissance) | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: new () => Reconnaissance; webkitSpeechRecognition?: new () => Reconnaissance };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function voixDisponible(): boolean {
  return !!constructeur();
}

/**
 * Écoute une phrase en français. `surTextes` reçoit les transcriptions possibles, la plus probable d'abord.
 * Renvoie la fonction qui interrompt l'écoute.
 */
export function ecouter(surTextes: (alternatives: string[]) => void, surErreur: (code: string) => void, surFin?: () => void): () => void {
  const C = constructeur();
  if (!C) { surErreur('indisponible'); surFin?.(); return () => {}; }
  const r = new C();
  r.lang = 'fr-FR';
  r.interimResults = false;
  r.maxAlternatives = 3;
  r.continuous = false;
  r.onresult = (e) => {
    const alternatives = Array.from(e.results[0] ?? []).map((a) => a.transcript.trim()).filter(Boolean);
    if (alternatives.length) surTextes(alternatives);
  };
  r.onerror = (e) => surErreur(e.error);
  r.onend = () => surFin?.();
  try { r.start(); } catch { surErreur('indisponible'); surFin?.(); }
  return () => r.abort();
}

export function messageErreur(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed': return 'Micro refusé : autorisez-le dans les réglages de Chrome.';
    case 'no-speech': return 'Je n’ai rien entendu.';
    case 'network': return 'La voix a besoin d’Internet.';
    case 'aborted': return '';
    default: return 'La reconnaissance vocale n’a pas fonctionné.';
  }
}

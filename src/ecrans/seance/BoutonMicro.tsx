import { useEffect, useRef, useState } from 'react';
import { ecouter, messageErreur, voixDisponible } from '../../voix/ecoute';

function useEnLigne(): boolean {
  const [enLigne, setEnLigne] = useState(() => navigator.onLine !== false);
  useEffect(() => {
    const suivre = () => setEnLigne(navigator.onLine !== false);
    window.addEventListener('online', suivre);
    window.addEventListener('offline', suivre);
    return () => { window.removeEventListener('online', suivre); window.removeEventListener('offline', suivre); };
  }, []);
  return enLigne;
}

interface Props { onTextes: (alternatives: string[]) => void; onErreur: (message: string) => void; petit?: boolean; libelle?: string }

/** Bouton micro : un appui lance l'écoute d'une phrase, un second l'interrompt. Absent si le navigateur n'a pas de reconnaissance vocale. */
export default function BoutonMicro({ onTextes, onErreur, petit, libelle = 'Parler' }: Props) {
  const enLigne = useEnLigne();
  const [ecoute, setEcoute] = useState(false);
  const arreter = useRef<() => void>(() => {});
  useEffect(() => () => arreter.current(), []);

  if (!voixDisponible()) return null;

  function basculer() {
    if (ecoute) { arreter.current(); setEcoute(false); return; }
    setEcoute(true);
    arreter.current = ecouter(onTextes, (code) => { const m = messageErreur(code); if (m) onErreur(m); }, () => setEcoute(false));
  }

  const nom = !enLigne ? 'Voix indisponible hors ligne' : ecoute ? 'Arrêter l’écoute' : libelle;
  return (
    <button type="button" className={`micro ${ecoute ? 'ecoute' : ''}`} style={petit ? { width: 48, height: 48, fontSize: '1.2rem' } : undefined}
      aria-label={nom} title={nom} disabled={!enLigne} onClick={basculer}>
      <span aria-hidden="true">🎤</span>
    </button>
  );
}

import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface Props { titre: string; sousTitre?: string; retour?: string | true; children?: ReactNode }

/** Bandeau du haut : bouton retour facultatif, titre, actions à droite. */
export default function EnTete({ titre, sousTitre, retour, children }: Props) {
  const naviguer = useNavigate();
  return (
    <header className="entete">
      {retour && (
        <button type="button" aria-label="Retour" onClick={() => (retour === true ? naviguer(-1) : naviguer(retour))}>←</button>
      )}
      <h1>
        {titre}
        {sousTitre && <span className="sous-titre">{sousTitre}</span>}
      </h1>
      {children}
    </header>
  );
}

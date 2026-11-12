import type { ReactNode } from 'react';

interface Props { titre: string; onFermer: () => void; children: ReactNode }

/** Panneau qui monte du bas de l'écran. Toucher le voile ou la croix le ferme. */
export default function Feuille({ titre, onFermer, children }: Props) {
  return (
    <div className="voile" onClick={onFermer}>
      <section className="feuille" role="dialog" aria-modal="true" aria-label={titre} onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>{titre}</h2>
          <button type="button" aria-label="Fermer" onClick={onFermer}>✕</button>
        </header>
        {children}
      </section>
    </div>
  );
}

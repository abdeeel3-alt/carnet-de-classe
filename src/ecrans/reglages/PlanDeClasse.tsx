import { DndContext, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import EnTete from '../../composants/EnTete';
import { deplacer, nomCourt, placementAuto, placeValide, type Changement, type Place } from '../../domaine/plan';
import type { Classe, Eleve } from '../../domaine/types';
import { modifier } from '../../stockage/depot';
import { useLigne, useListe } from '../../stockage/hooks';

function Etiquette({ eleve, choisi, onToucher }: { eleve: Eleve; choisi: boolean; onToucher: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: eleve.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 30, opacity: isDragging ? 0.85 : 1 } : undefined;
  return (
    <button ref={setNodeRef} type="button" className="case occupee" style={{ ...style, touchAction: 'none', width: '100%' }}
      {...listeners} {...attributes} aria-pressed={choisi} onClick={onToucher}>
      <b>{eleve.numero}</b>
      <span>{nomCourt(eleve)}</span>
    </button>
  );
}

function CasePlan({ place, eleve, choisi, onToucher }: { place: Place; eleve: Eleve | undefined; choisi: string | null; onToucher: (e: Eleve | undefined, p: Place) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `case-${place.rangee}-${place.colonne}` });
  return (
    <div ref={setNodeRef} className={isOver ? 'survol' : ''} style={{ borderRadius: 10 }}>
      {eleve
        ? <Etiquette eleve={eleve} choisi={choisi === eleve.id} onToucher={() => onToucher(eleve, place)} />
        : <button type="button" className="case" style={{ width: '100%', cursor: choisi ? 'pointer' : 'default' }}
            aria-label={`Place libre, rangée ${place.rangee + 1}, colonne ${place.colonne + 1}`} onClick={() => onToucher(undefined, place)} />}
    </div>
  );
}

function ZoneNonPlaces({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'hors-plan' });
  return (
    <div ref={setNodeRef} role="group" aria-label="Non placés" className={`carte ${isOver ? 'survol' : ''}`}>
      <strong>Non placés</strong>
      {children}
    </div>
  );
}

/** Placement des élèves : glisser-déposer, ou toucher un élève puis sa place. */
export default function PlanDeClasse() {
  const { id: classeId = '' } = useParams();
  const classe = useLigne<Classe>('classes', classeId);
  const eleves = useListe<Eleve>('eleves', { classe_id: classeId });
  const [choisi, setChoisi] = useState<string | null>(null);
  const capteurs = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  );

  if (!classe || !eleves) return <EnTete titre="Plan de classe" retour={`/reglages/classes/${classeId}`} />;
  const { plan_rangees: rangees, plan_colonnes: colonnes } = classe;
  const tries = [...eleves].sort((a, b) => a.numero - b.numero);
  const places = tries.filter((e) => placeValide(e, rangees, colonnes));
  const nonPlaces = tries.filter((e) => !placeValide(e, rangees, colonnes));

  const appliquer = async (changements: Changement[]) => {
    for (const c of changements) await modifier<Eleve>('eleves', c.id, { rangee: c.rangee, colonne: c.colonne });
  };

  function toucher(eleve: Eleve | undefined, place: Place | null) {
    if (!choisi) { if (eleve) setChoisi(eleve.id); return; }
    if (eleve?.id === choisi) { setChoisi(null); return; }
    appliquer(deplacer(eleves!, choisi, place));
    setChoisi(null);
  }

  function finGlisser(e: DragEndEvent) {
    const cible = e.over?.id;
    if (typeof cible !== 'string') return;
    setChoisi(null);
    if (cible === 'hors-plan') { appliquer(deplacer(eleves!, String(e.active.id), null)); return; }
    const [, r, c] = cible.split('-');
    appliquer(deplacer(eleves!, String(e.active.id), { rangee: Number(r), colonne: Number(c) }));
  }

  const taille = (champ: 'plan_rangees' | 'plan_colonnes', delta: number) =>
    modifier<Classe>('classes', classeId, { [champ]: Math.min(10, Math.max(1, classe[champ] + delta)) });

  const cases = [];
  for (let r = 0; r < rangees; r++) {
    for (let c = 0; c < colonnes; c++) {
      cases.push(<CasePlan key={`${r}-${c}`} place={{ rangee: r, colonne: c }} choisi={choisi}
        eleve={places.find((x) => x.rangee === r && x.colonne === c)} onToucher={toucher} />);
    }
  }

  return (
    <>
      <EnTete titre="Plan de classe" sousTitre={classe.nom} retour={`/reglages/classes/${classeId}`} />
      <div className="contenu">
        <p className="info">{choisi ? 'Touchez maintenant la place de cet élève.' : 'Glissez un élève vers sa place, ou touchez l’élève puis la place.'}</p>
        <div className="rangee">
          <span className="doux">Rangées : <b>{rangees}</b></span>
          <button type="button" className="bouton" aria-label="Retirer une rangée" disabled={rangees <= 1} onClick={() => taille('plan_rangees', -1)}>−</button>
          <button type="button" className="bouton" aria-label="Ajouter une rangée" disabled={rangees >= 10} onClick={() => taille('plan_rangees', 1)}>+</button>
          <span className="doux">Colonnes : <b>{colonnes}</b></span>
          <button type="button" className="bouton" aria-label="Retirer une colonne" disabled={colonnes <= 1} onClick={() => taille('plan_colonnes', -1)}>−</button>
          <button type="button" className="bouton" aria-label="Ajouter une colonne" disabled={colonnes >= 10} onClick={() => taille('plan_colonnes', 1)}>+</button>
        </div>
        <button type="button" className="bouton" onClick={() => appliquer(placementAuto(eleves, rangees, colonnes))}>Placer automatiquement</button>

        <DndContext sensors={capteurs} onDragEnd={finGlisser}>
          <div className="plan" role="group" aria-label="Plan de classe" style={{ gridTemplateColumns: `repeat(${colonnes}, minmax(0, 1fr))` }}>
            <div className="tableau-noir">TABLEAU</div>
            {cases}
          </div>
          <ZoneNonPlaces>
            {!nonPlaces.length && <p className="doux">Tous les élèves sont placés. Glissez un élève ici pour le retirer du plan.</p>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', gap: 6 }}>
              {nonPlaces.map((e) => <Etiquette key={e.id} eleve={e} choisi={choisi === e.id} onToucher={() => toucher(e, null)} />)}
            </div>
            {choisi && places.some((e) => e.id === choisi) && (
              <button type="button" className="bouton" onClick={() => toucher(undefined, null)}>Retirer du plan</button>
            )}
          </ZoneNonPlaces>
        </DndContext>
      </div>
    </>
  );
}

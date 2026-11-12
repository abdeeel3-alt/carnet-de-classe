import { useRef } from 'react';

/**
 * Gestes d'une case d'élève : toucher, ou appui long (500 ms, ou menu contextuel qui est l'appui long d'Android).
 * Le toucher qui suit immédiatement un appui long est ignoré.
 */
export function useAppuiLong(onToucher: () => void, onAppuiLong: () => void) {
  const minuteur = useRef<ReturnType<typeof setTimeout>>();
  const vientDAppuyerLong = useRef(false);
  const declencher = () => { vientDAppuyerLong.current = true; onAppuiLong(); };
  const arreter = () => clearTimeout(minuteur.current);
  return {
    onPointerDown: () => { vientDAppuyerLong.current = false; arreter(); minuteur.current = setTimeout(declencher, 500); },
    onPointerUp: arreter,
    onPointerLeave: arreter,
    onPointerCancel: arreter,
    onContextMenu: (e: { preventDefault(): void }) => { e.preventDefault(); arreter(); if (!vientDAppuyerLong.current) declencher(); },
    onClick: () => { if (vientDAppuyerLong.current) { vientDAppuyerLong.current = false; return; } onToucher(); },
  };
}

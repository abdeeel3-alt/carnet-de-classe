import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Base, NomTable } from '../domaine/types';

/** Le serveur vu par la synchronisation. Le curseur est opaque : seul le serveur sait le comparer. */
export interface Distant {
  pousser(table: NomTable, lignes: Base[]): Promise<void>;
  tirer(table: NomTable, curseur: string | null): Promise<{ lignes: Base[]; curseur: string | null }>;
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const cle = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** `null` en mode local : pas de compte, pas de synchronisation. */
export const client: SupabaseClient | null = url && cle ? createClient(url, cle) : null;

const LOT = 500;

export function distantSupabase(c: SupabaseClient): Distant {
  const utilisateur = async () => {
    const { data } = await c.auth.getSession();
    if (!data.session) throw new Error('non connecté');
    return data.session.user.id;
  };
  return {
    async pousser(table, lignes) {
      const user_id = await utilisateur();
      for (let i = 0; i < lignes.length; i += LOT) {
        const lot = lignes.slice(i, i + LOT).map((l) => ({ ...l, user_id }));
        const { error } = await c.from(table).upsert(lot, { onConflict: 'user_id,id' });
        if (error) throw error;
      }
    },
    async tirer(table, curseur) {
      await utilisateur();
      const lignes: Base[] = [];
      let dernier = curseur;
      for (;;) {
        let requete = c.from(table).select('*').order('synced_at', { ascending: true }).limit(LOT);
        if (dernier) requete = requete.gt('synced_at', dernier);
        const { data, error } = await requete;
        if (error) throw error;
        for (const { user_id: _u, synced_at, ...ligne } of data ?? []) {
          lignes.push(ligne as Base);
          dernier = synced_at as string;
        }
        if (!data || data.length < LOT) break;
      }
      return { lignes, curseur: dernier };
    },
  };
}

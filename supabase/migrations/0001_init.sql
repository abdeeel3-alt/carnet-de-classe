-- Carnet de classe : schéma initial.
-- Chaque ligne appartient à un professeur (user_id) ; la sécurité au niveau des lignes interdit tout accès aux lignes d'un autre compte.
-- updated_at vient de l'appareil (la plus récente l'emporte) ; synced_at est posé par le serveur et sert de curseur de synchronisation.

create table classes (
  id text not null, user_id uuid not null default auth.uid() references auth.users on delete cascade,
  updated_at timestamptz not null, deleted boolean not null default false, synced_at timestamptz not null default now(),
  nom text not null, niveau text not null check (niveau in ('2AC','3AC')), annee text not null, archivee boolean not null default false,
  plan_rangees integer not null, plan_colonnes integer not null,
  primary key (user_id, id)
);
create table eleves (
  id text not null, user_id uuid not null default auth.uid() references auth.users on delete cascade,
  updated_at timestamptz not null, deleted boolean not null default false, synced_at timestamptz not null default now(),
  classe_id text not null, numero integer not null, nom text not null, prenom text not null default '',
  rangee integer, colonne integer, remarques text not null default '',
  primary key (user_id, id)
);
create table creneaux (
  id text not null, user_id uuid not null default auth.uid() references auth.users on delete cascade,
  updated_at timestamptz not null, deleted boolean not null default false, synced_at timestamptz not null default now(),
  jour integer not null check (jour between 1 and 6), debut text not null, fin text not null, classe_id text not null, salle text not null default '',
  primary key (user_id, id)
);
create table seances (
  id text not null, user_id uuid not null default auth.uid() references auth.users on delete cascade,
  updated_at timestamptz not null, deleted boolean not null default false, synced_at timestamptz not null default now(),
  classe_id text not null, creneau_id text, debut timestamptz not null, terminee boolean not null default false,
  primary key (user_id, id)
);
create table types_observation (
  id text not null, user_id uuid not null default auth.uid() references auth.users on delete cascade,
  updated_at timestamptz not null, deleted boolean not null default false, synced_at timestamptz not null default now(),
  critere text not null check (critere in ('presence','reglement','participation','discipline','serieux')),
  libelle text not null, points integer not null, ordre integer not null, masque boolean not null default false,
  synonymes jsonb not null default '[]', code text check (code in ('absent','retard')),
  primary key (user_id, id)
);
create table observations (
  id text not null, user_id uuid not null default auth.uid() references auth.users on delete cascade,
  updated_at timestamptz not null, deleted boolean not null default false, synced_at timestamptz not null default now(),
  seance_id text not null, eleve_id text not null, type_id text not null,
  critere text not null check (critere in ('presence','reglement','participation','discipline','serieux')),
  code text check (code in ('absent','retard')), libelle text not null, points integer not null, horodatage timestamptz not null,
  primary key (user_id, id)
);
create table regles (
  id text not null, user_id uuid not null default auth.uid() references auth.users on delete cascade,
  updated_at timestamptz not null, deleted boolean not null default false, synced_at timestamptz not null default now(),
  nom text not null, type text not null check (type in ('badge','sanction')), cible text not null, seuil integer not null,
  periode text not null check (periode in ('semaine','mois','semestre')),
  primary key (user_id, id)
);
create table attributions (
  id text not null, user_id uuid not null default auth.uid() references auth.users on delete cascade,
  updated_at timestamptz not null, deleted boolean not null default false, synced_at timestamptz not null default now(),
  eleve_id text not null, regle_id text, libelle text not null, type text not null check (type in ('badge','sanction')),
  date timestamptz not null, etat text not null check (etat in ('proposee','validee','refusee')), cle_periode text not null default '',
  primary key (user_id, id)
);
create table parametres (
  id text not null, user_id uuid not null default auth.uid() references auth.users on delete cascade,
  updated_at timestamptz not null, deleted boolean not null default false, synced_at timestamptz not null default now(),
  semestre1_debut text not null, semestre1_fin text not null, semestre2_debut text not null, semestre2_fin text not null,
  etablissement text not null default '', professeur text not null default '', matiere text not null default '',
  primary key (user_id, id)
);

-- À chaque écriture : on garde la ligne la plus récente et on date la synchronisation.
create function garder_la_plus_recente() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.updated_at <= old.updated_at then
    return null;
  end if;
  new.synced_at := clock_timestamp();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['classes','eleves','creneaux','seances','types_observation','observations','regles','attributions','parametres'] loop
    execute format('create index %I on %I (user_id, synced_at)', t || '_synced', t);
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t || '_proprietaire', t);
    execute format('create trigger %I before insert or update on %I for each row execute function garder_la_plus_recente()', t || '_recente', t);
  end loop;
end $$;

import { useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

type Mode = 'connexion' | 'creation' | 'oubli';

/** Adresse complète de l'application : les liens des e-mails de Supabase doivent y ramener, sous-dossier compris. */
const adresseAppli = `${window.location.origin}${import.meta.env.BASE_URL}`;

export default function Connexion({ client, retourPossible }: { client: SupabaseClient; retourPossible?: boolean }) {
  const [mode, setMode] = useState<Mode>('connexion');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);

  async function valider(e: FormEvent) {
    e.preventDefault();
    setErreur(''); setMessage(''); setOccupe(true);
    const resultat =
      mode === 'connexion' ? await client.auth.signInWithPassword({ email, password: motDePasse })
      : mode === 'creation' ? await client.auth.signUp({ email, password: motDePasse, options: { emailRedirectTo: adresseAppli } })
      : await client.auth.resetPasswordForEmail(email, { redirectTo: adresseAppli });
    setOccupe(false);
    if (resultat.error) {
      setErreur(mode === 'connexion' ? 'E-mail ou mot de passe incorrect.' : `Impossible : ${resultat.error.message}`);
    } else if (mode === 'creation') {
      setMessage('Compte créé. Si un e-mail de confirmation vous est envoyé, ouvrez-le puis connectez-vous.');
    } else if (mode === 'oubli') {
      setMessage('Un e-mail de réinitialisation vous a été envoyé.');
    }
  }

  const titre = { connexion: 'Connexion', creation: 'Créer un compte', oubli: 'Mot de passe oublié' }[mode];
  return (
    <div className="contenu" style={{ maxWidth: 420, margin: '0 auto', paddingTop: 48 }}>
      <h1 className="gros">Carnet de classe</h1>
      <form className="carte" onSubmit={valider}>
        <h2>{titre}</h2>
        <label className="champ"><span>E-mail</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {mode !== 'oubli' && (
          <label className="champ"><span>Mot de passe</span>
            <input type="password" required minLength={8} autoComplete={mode === 'creation' ? 'new-password' : 'current-password'} value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
          </label>
        )}
        {erreur && <p className="erreur" role="alert">{erreur}</p>}
        {message && <p className="info" role="status">{message}</p>}
        <button className="bouton primaire large" disabled={occupe}>{mode === 'oubli' ? 'Envoyer le lien' : titre}</button>
      </form>
      <div className="rangee">
        {mode !== 'connexion' && <button type="button" className="bouton discret" onClick={() => setMode('connexion')}>J’ai déjà un compte</button>}
        {mode !== 'creation' && <button type="button" className="bouton discret" onClick={() => setMode('creation')}>Créer un compte</button>}
        {mode === 'connexion' && <button type="button" className="bouton discret" onClick={() => setMode('oubli')}>Mot de passe oublié</button>}
        {retourPossible && <a className="bouton discret" href={import.meta.env.BASE_URL}>Continuer sans connexion</a>}
      </div>
    </div>
  );
}

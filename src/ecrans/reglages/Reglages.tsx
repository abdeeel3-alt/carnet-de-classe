import { Link } from 'react-router-dom';
import EnTete from '../../composants/EnTete';
import IndicateurSynchro from '../../composants/IndicateurSynchro';
import { base } from '../../stockage/base';
import { viderBase } from '../../stockage/depot';
import { client } from '../../stockage/distant';
import { useEtatSynchro } from '../../stockage/synchro';

const LIENS = [
  { vers: '/reglages/classes', nom: 'Classes et élèves', detail: 'Listes, import, plan de classe' },
  { vers: '/emploi-du-temps', nom: 'Emploi du temps', detail: 'Créneaux de la semaine' },
  { vers: '/reglages/catalogue', nom: 'Observations', detail: 'Listes d’options et points' },
  { vers: '/reglages/regles', nom: 'Badges et sanctions', detail: 'Règles et seuils' },
  { vers: '/reglages/parametres', nom: 'Paramètres', detail: 'Semestres, en-tête des documents' },
];

export default function Reglages() {
  const synchro = useEtatSynchro();
  async function seDeconnecter() {
    const enAttente = await base.file_attente.count();
    if (enAttente && !window.confirm(`${enAttente} changement(s) ne sont pas encore synchronisés et seront perdus. Se déconnecter quand même ?`)) return;
    await client!.auth.signOut();
    await viderBase();
    window.location.assign(import.meta.env.BASE_URL);
  }
  return (
    <>
      <EnTete titre="Réglages"><IndicateurSynchro /></EnTete>
      <div className="contenu">
        <ul className="liste">
          {LIENS.map((l) => (
            <li key={l.vers}>
              <Link className="ligne" to={l.vers}>
                <span className="principal"><strong>{l.nom}</strong><span className="doux">{l.detail}</span></span>
                <span className="chevron" aria-hidden="true">›</span>
              </Link>
            </li>
          ))}
        </ul>
        {synchro.etat === 'erreur' && (
          <p className="erreur" role="alert">La synchronisation est refusée par le serveur : {synchro.message}. Vos données restent enregistrées sur cet appareil.</p>
        )}
        {synchro.etat === 'deconnecte' && (
          <div className="carte">
            <p>Vous n’êtes pas connecté : vos saisies sont enregistrées sur cet appareil et partiront après la reconnexion.</p>
            <a className="bouton primaire" href={`${import.meta.env.BASE_URL}?connexion`}>Se reconnecter</a>
          </div>
        )}
        {client
          ? <button type="button" className="bouton" onClick={seDeconnecter}>Se déconnecter</button>
          : <p className="info">Mode local : les données restent sur cet appareil, sans compte ni synchronisation.</p>}
      </div>
    </>
  );
}

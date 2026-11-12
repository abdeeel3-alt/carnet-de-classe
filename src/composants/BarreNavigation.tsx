import { NavLink } from 'react-router-dom';

const LIENS = [
  { vers: '/', nom: 'Accueil', pictogramme: '🏠' },
  { vers: '/emploi-du-temps', nom: 'Emploi du temps', pictogramme: '🗓️' },
  { vers: '/exports', nom: 'Exports', pictogramme: '📄' },
  { vers: '/reglages', nom: 'Réglages', pictogramme: '⚙️' },
];

export default function BarreNavigation() {
  return (
    <nav className="barre" aria-label="Navigation principale">
      {LIENS.map((l) => (
        <NavLink key={l.vers} to={l.vers} end={l.vers === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="pictogramme" aria-hidden="true">{l.pictogramme}</span>
          {l.nom}
        </NavLink>
      ))}
    </nav>
  );
}

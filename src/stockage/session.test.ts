import { ecranDeDemarrage } from './session';

test('session valide : l’application, avec synchronisation', () => {
  expect(ecranDeDemarrage('u1', 'u1', false)).toEqual({ ecran: 'appli', synchro: true });
  expect(ecranDeDemarrage(undefined, 'u1', false)).toEqual({ ecran: 'appli', synchro: true });
});
test('sans session mais déjà utilisé sur cet appareil (démarrage sans réseau) : l’application, sans synchronisation', () => {
  expect(ecranDeDemarrage('u1', null, false)).toEqual({ ecran: 'appli', synchro: false });
});
test('sans session et jamais utilisé sur cet appareil : connexion', () => {
  expect(ecranDeDemarrage(undefined, null, false)).toEqual({ ecran: 'connexion', synchro: false });
});
test('reconnexion demandée par le professeur : connexion', () => {
  expect(ecranDeDemarrage('u1', null, true)).toEqual({ ecran: 'connexion', synchro: false });
});

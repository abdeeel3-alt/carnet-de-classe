import { expect, test, type Page } from '@playwright/test';

const ELEVES = 'ALAOUI Sara\nAMRANI Yassine\nBENNANI Salma\nCHRAIBI Omar\nTAZI Yassine';

/** Jour et créneau qui couvrent l'instant présent, pour que l'accueil propose « Démarrer ». Le dimanche n'a pas de créneau. */
function creneauCourant() {
  const maintenant = new Date();
  const h = maintenant.getHours();
  const jours = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const dansLaGrille = maintenant.getDay() !== 0 && h >= 8 && h < 19;
  const z = (n: number) => String(n).padStart(2, '0');
  return { dansLaGrille, jour: jours[maintenant.getDay()], debut: `${z(h)}:00`, fin: h === 18 ? '19:00' : `${z(h + 1)}:00` };
}

async function creerClasseEtEleves(page: Page) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Créer une classe' }).click();
  await page.getByRole('button', { name: '+ Nouvelle classe' }).click();
  await page.getByLabel('Nom de la classe').fill('3AC-2');
  await page.getByRole('button', { name: 'Créer la classe' }).click();
  await page.getByRole('link', { name: /3AC-2/ }).click();
  await page.getByRole('link', { name: 'Importer' }).click();
  await page.getByRole('tab', { name: 'Saisie' }).click();
  await page.getByLabel('Un élève par ligne').fill(ELEVES);
  await page.getByRole('button', { name: 'Aperçu' }).click();
  await page.getByRole('button', { name: 'Importer 5 élèves' }).click();
  await expect(page.getByRole('button', { name: /TAZI Yassine/ })).toBeVisible();
}

test('une séance complète, de la création de la classe à l’export', async ({ page }) => {
  await creerClasseEtEleves(page);

  // Emploi du temps : un créneau qui couvre l'heure courante, quand elle tombe dans la grille.
  const c = creneauCourant();
  if (c.dansLaGrille) {
    await page.goto('/emploi-du-temps');
    await page.getByRole('tab', { name: c.jour }).click();
    await page.getByRole('button', { name: '+ Créneau' }).click();
    await page.getByLabel('Début').selectOption(c.debut);
    await page.getByLabel('Fin').selectOption(c.fin);
    await page.getByLabel('Salle').fill('7');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await page.goto('/');
    await expect(page.getByRole('region', { name: 'En cours' })).toContainText('Salle 7');
    await page.getByRole('button', { name: 'Démarrer' }).click();
  } else {
    await page.goto('/');
    await page.getByRole('button', { name: /3AC-2/ }).click();
  }
  await expect(page).toHaveURL(/\/seance\//);

  // Appel et observations.
  await page.getByRole('button', { name: /AMRANI Yassine/ }).click();
  await page.getByRole('button', { name: /^Absent/ }).click();
  await expect(page.getByRole('button', { name: /AMRANI Yassine/ }).getByLabel('Absent')).toBeVisible();
  for (let i = 1; i <= 5; i++) {
    await page.getByRole('button', { name: /BENNANI Salma/ }).click();
    await page.getByRole('button', { name: /^Bavardage/ }).click();
    await expect(page.getByRole('button', { name: /BENNANI Salma/ }).getByLabel(`Discipline −${i}`)).toBeVisible();
  }

  // Fin de séance : la sanction proposée est validée.
  await page.getByRole('link', { name: 'Terminer la séance' }).click();
  await expect(page.getByLabel('Absents : 1')).toContainText('AMRANI Yassine');
  const proposition = page.getByRole('listitem', { name: /Avertissement pour BENNANI Salma/ });
  await proposition.getByRole('button', { name: 'Valider' }).click();
  await expect(proposition).toHaveCount(0);
  await page.getByRole('button', { name: 'Terminer', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);

  // Fiche élève : la période choisie filtre tout.
  await page.goto('/reglages/classes');
  await page.getByRole('link', { name: /3AC-2/ }).click();
  await page.getByRole('button', { name: /BENNANI Salma/ }).click();
  await page.getByRole('link', { name: 'Voir la fiche' }).click();
  await expect(page.getByLabel('Discipline : −5')).toBeVisible();
  await expect(page.getByText('Avertissement')).toBeVisible();
  await page.getByRole('button', { name: 'Dates' }).click();
  await page.getByLabel('Du').fill('2020-01-01');
  await page.getByLabel('Au').fill('2020-01-31');
  await expect(page.getByText('Aucune observation sur cette période.')).toBeVisible();
  await expect(page.getByLabel('Discipline : 0')).toBeVisible();

  // Les données survivent au rechargement.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Semestre 1' }).or(page.getByRole('button', { name: 'Semestre 2' })).first()).toBeVisible();
  await expect(page.getByLabel('Discipline : −5')).toBeVisible();

  // Export Excel.
  await page.goto('/exports');
  await page.getByRole('button', { name: /Bilan de comportement/ }).click();
  const telechargement = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Télécharger le fichier Excel' }).click();
  expect((await telechargement).suggestedFilename()).toMatch(/^bilan_3AC-2_.*\.xlsx$/);
});

test('plan de classe : placement par glisser-déposer, puis vue Plan en séance', async ({ page }) => {
  await creerClasseEtEleves(page);
  await page.getByRole('link', { name: 'Plan de classe' }).click();
  const eleve = page.getByRole('button', { name: /3 Salma B\./ });
  const place = page.getByRole('button', { name: 'Place libre, rangée 2, colonne 3' });
  await eleve.scrollIntoViewIfNeeded();
  const de = (await eleve.boundingBox())!;
  const vers = (await place.boundingBox())!;
  await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2);
  await page.mouse.down();
  await page.mouse.move(de.x + de.width / 2 + 12, de.y + de.height / 2 - 12, { steps: 3 });
  await page.mouse.move(vers.x + vers.width / 2, vers.y + vers.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByRole('group', { name: 'Plan de classe' }).getByRole('button', { name: /3 Salma B\./ })).toBeVisible();
  await expect(place).toHaveCount(0);

  await page.goto('/');
  await page.getByRole('button', { name: /3AC-2/ }).click();
  await page.getByRole('button', { name: 'Plan', exact: true }).click();
  await page.getByRole('group', { name: 'Plan de classe' }).getByRole('button', { name: /3 Salma B\./ }).click();
  await page.getByRole('button', { name: /Excellente réponse/ }).click();
  await expect(page.getByRole('group', { name: 'Plan de classe' }).getByLabel('Participation +2')).toBeVisible();
});

test('l’application installée se rouvre hors ligne', async ({ page, context }) => {
  await creerClasseEtEleves(page);
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: /3AC-2/ })).toBeVisible();
  await page.getByRole('button', { name: /3AC-2/ }).click();
  await page.getByRole('button', { name: /CHRAIBI Omar/ }).click();
  await page.getByRole('button', { name: /Bonne participation/ }).click();
  await expect(page.getByRole('button', { name: /CHRAIBI Omar/ }).getByLabel('Participation +1')).toBeVisible();
});

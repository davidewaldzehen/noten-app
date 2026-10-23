import { expect, test, type Locator, type Page } from '@playwright/test';

/** Legt die Lerngruppe „7a Mathe“ mit drei Schülern an und öffnet den Unterricht. */
async function lerngruppeAnlegen(page: Page, klasse = '') {
  await page.goto('./');
  await page.getByRole('link', { name: 'Neue Lerngruppe', exact: true }).click();
  await page.getByLabel('Name der Lerngruppe').fill('7a Mathe');
  await page.getByLabel('Fach').fill('Mathe');
  await page.getByRole('button', { name: 'Anlegen und Schüler hinzufügen' }).click();
  await page.locator('textarea').fill('Anna Müller\nBen Schulz\nClara Wolf');
  if (klasse) await page.getByLabel('Klasse (falls nicht in der Liste)').fill(klasse);
  await page.getByRole('button', { name: '3 Schüler hinzufügen' }).click();
  await page.getByRole('link', { name: 'Unterricht' }).click();
}

const schueler = (page: Page, vorname: string) => page.getByRole('button', { name: new RegExp(`^${vorname}`) });

async function langDruecken(page: Page, ziel: Locator) {
  const box = (await ziel.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
}

test('Stunde erfassen, abschließen und benoten', async ({ page }) => {
  await lerngruppeAnlegen(page);

  await schueler(page, 'Anna').click();
  await expect(page.getByRole('status')).toContainText('+ für Anna');
  await schueler(page, 'Anna').click();
  await langDruecken(page, schueler(page, 'Ben'));
  await page.getByRole('button', { name: /konnte nicht antworten/ }).click();
  await expect(page.getByText('3 Beobachtungen')).toBeVisible();

  await page.getByRole('button', { name: 'Stunde abschließen' }).click();
  await schueler(page, 'Clara').click();
  await page.getByRole('button', { name: 'abwesend', exact: true }).click();
  await page.getByRole('button', { name: 'Alle bestätigen' }).click();
  await expect(page.getByText('Tippen beginnt die Stunde')).toBeVisible();

  await page.getByRole('link', { name: 'Noten' }).click();
  await page.locator('select').first().selectOption('jahr');
  // ++ zählt 1, + 2, − 4 (Standard); Klassenarbeiten fehlen und werden herausgerechnet.
  await expect(page.getByRole('row', { name: /Müller, Anna/ })).toContainText('2,00');
  await expect(page.getByRole('row', { name: /Schulz, Ben/ })).toContainText('4,00');
  await expect(page.getByRole('row', { name: /Wolf, Clara/ })).not.toContainText(',00');
});

test('Notenübersicht zeigt, wie viele Stunden hinter der Mündlichen Note stehen', async ({ page }) => {
  await lerngruppeAnlegen(page);
  await schueler(page, 'Anna').click();
  await page.getByRole('button', { name: 'Stunde abschließen' }).click();
  await schueler(page, 'Clara').click();
  await page.getByRole('button', { name: 'abwesend', exact: true }).click();
  await page.getByRole('button', { name: 'Alle bestätigen' }).click();

  await page.getByRole('link', { name: 'Noten' }).click();
  await page.locator('select').first().selectOption('jahr');
  const stunden = (name: RegExp) => page.getByRole('row', { name }).locator('.stunden');
  // gewertete Stunden, dann ++ / + / ○ / − / −−
  await expect(stunden(/Müller, Anna/)).toHaveText(/^\s*1\s+0\s*1\s*0\s*0\s*0\s*$/);
  await expect(stunden(/Schulz, Ben/)).toHaveText(/^\s*1\s+0\s*0\s*1\s*0\s*0\s*$/);
  await expect(stunden(/Wolf, Clara/)).toHaveText(/^\s*0\s+0\s*0\s*0\s*0\s*0\s*$/);

  await page.getByRole('link', { name: 'Müller, Anna' }).click();
  await expect(page.getByText('1 gewertete Stunden')).toBeVisible();
});

test('Notiz zu einem Schüler im Schülerbericht', async ({ page }) => {
  await lerngruppeAnlegen(page);
  await page.getByRole('link', { name: 'Noten' }).click();
  await page.getByRole('link', { name: 'Müller, Anna' }).click();
  await expect(page.getByText('Keine Notizen.')).toBeVisible();

  await page.getByLabel('Datum').fill('2026-10-22');
  await page.getByLabel('Neue Notiz').fill('Elterngespräch: Förderplan Lesen vereinbart');
  await page.getByRole('button', { name: 'Notiz hinzufügen' }).click();
  const notiz = page.getByLabel('Notiz vom 22.10.2026');
  await expect(notiz).toHaveValue('Elterngespräch: Förderplan Lesen vereinbart');

  await notiz.fill('Elterngespräch: Förderplan Lesen, Termin im Januar');
  await notiz.blur();
  await page.reload();
  await expect(page.getByLabel('Notiz vom 22.10.2026')).toHaveValue('Elterngespräch: Förderplan Lesen, Termin im Januar');

  await page.getByRole('button', { name: 'Löschen' }).click();
  await expect(page.getByText('Keine Notizen.')).toBeVisible();
  await page.getByRole('button', { name: 'Rückgängig' }).click();
  await expect(page.getByLabel('Notiz vom 22.10.2026')).toBeVisible();

  // Notizen gehören zu dieser Lerngruppe und zu diesem Schüler.
  await page.goto('./');
  await page.getByRole('link', { name: /7a Mathe/ }).click();
  await page.getByRole('link', { name: 'Noten' }).click();
  await page.getByRole('link', { name: 'Schulz, Ben' }).click();
  await expect(page.getByText('Keine Notizen.')).toBeVisible();
});

test('Lerngruppe ins neue Schuljahr übernehmen', async ({ page }) => {
  await lerngruppeAnlegen(page, '7a');
  await schueler(page, 'Anna').click();
  await page.getByRole('button', { name: 'Stunde abschließen' }).click();
  await page.getByRole('button', { name: 'Alle bestätigen' }).click();

  await page.getByRole('link', { name: 'Einstellungen' }).click();
  await page.getByRole('button', { name: 'Ins neue Schuljahr übernehmen …' }).click();
  await expect(page.getByLabel('Name der neuen Lerngruppe')).toHaveValue('8a Mathe');
  const schuljahr = page.getByLabel('Neues Schuljahr');
  await expect(schuljahr).toHaveValue(/^\d{4}\/\d{2}$/);
  await page.getByRole('button', { name: 'Übernehmen und diese archivieren' }).click();
  await expect(page.getByRole('status')).toContainText('„8a Mathe“ angelegt, „7a Mathe“ archiviert');

  // Gleicher Sitzplan mit denselben Schülern, aber keine Stunden.
  await expect(page.getByRole('heading', { name: '8a Mathe' })).toBeVisible();
  await expect(schueler(page, 'Anna')).toBeVisible();
  await expect(page.getByText('Tippen beginnt die Stunde')).toBeVisible();
  await page.getByRole('link', { name: 'Stunden' }).click();
  await expect(page.getByText('Noch keine Stunden')).toBeVisible();
  await page.getByRole('link', { name: 'Schüler' }).click();
  await expect(page.locator('input.klasse').first()).toHaveValue('8a');

  // Die alte Lerngruppe liegt mit ihrer Stunde im Archiv.
  await page.goto('./');
  await page.getByText('Archiv (1)').click();
  await page.getByRole('link', { name: /7a Mathe/ }).click();
  await page.getByRole('link', { name: 'Stunden' }).click();
  await expect(page.getByRole('heading', { name: '7a Mathe' })).toBeVisible();
  await expect(page.getByText('Noch keine Stunden')).not.toBeVisible();
});

test('Klassenarbeit mit Punkten und Notenschlüssel', async ({ page }) => {
  await lerngruppeAnlegen(page);
  await page.getByRole('link', { name: 'Leistungsnachweise' }).click();
  await page.getByRole('button', { name: '+ Neu' }).first().click();
  await page.getByLabel('Höchstpunktzahl').fill('50');
  await page.getByRole('button', { name: 'Punkte eintragen' }).click();

  // Standard 92 / 81 / 67 / 50 / 30 % mit Tendenzen; die Grenze muss erreicht werden.
  await page.getByLabel('Punkte Anna Müller').fill('46');
  await page.getByLabel('Punkte Anna Müller').press('Enter');
  await page.getByLabel('Punkte Ben Schulz').fill('45,5');
  await page.getByLabel('Punkte Ben Schulz').press('Enter');
  await page.getByLabel('Punkte Clara Wolf').fill('51');
  await page.getByLabel('Punkte Clara Wolf').press('Enter');
  const zeile = (name: string) => page.getByRole('row', { name: new RegExp(name) });
  await expect(zeile('Müller, Anna')).toContainText('1−');
  await expect(zeile('Schulz, Ben')).toContainText('2+');
  await expect(zeile('Wolf, Clara')).toContainText('ungültig');

  await page.getByLabel('1 ab %').fill('90');
  await page.getByLabel('1 ab %').press('Tab');
  await expect(zeile('Schulz, Ben')).toContainText('1−');
  await page.getByLabel(/Tendenzen/).uncheck();
  await expect(zeile('Müller, Anna')).toContainText('1,00');
  await expect(page.locator('.punktetabelle').getByRole('row', { name: /^1 / })).toHaveText(/1\s*45/);

  page.once('dialog', (d) => d.accept('Mathe Sek I'));
  await page.getByRole('button', { name: 'Als Vorlage speichern' }).click();
  await expect(page.getByRole('status')).toContainText('Vorlage „Mathe Sek I“ gespeichert');

  await page.reload();
  await expect(page.getByLabel('Punkte Anna Müller')).toHaveValue('46');
  await page.getByRole('link', { name: 'Zurück' }).click();
  await page.getByRole('link', { name: 'Noten' }).click();
  await expect(zeile('Müller, Anna')).toContainText('1,00');

  await page.goto('./#/einstellungen');
  await expect(page.getByRole('row', { name: /Mathe Sek I/ })).toContainText('1: 90 %');
});

test('Datenschutz-Seite und Markierungen verbergen am Beamer', async ({ page }) => {
  await page.goto('./#/einstellungen');
  await page.getByRole('link', { name: 'Datenschutz-Informationen' }).click();
  await expect(page.getByRole('heading', { name: 'Datenschutz-Informationen zur Noten-App' })).toBeVisible();
  await expect(page.getByText('verschlüsselt mit AES-256-GCM')).toBeVisible();
  await expect(page.getByText('600.000 Durchläufe')).toBeVisible();
  await expect(page.getByText('http://localhost:4173/')).toBeVisible();

  await lerngruppeAnlegen(page);
  await page.getByRole('button', { name: 'Markierungen verbergen' }).click();
  await schueler(page, 'Anna').click();
  await expect(page.getByRole('status')).toHaveText(/Festgehalten\./);
  await expect(schueler(page, 'Anna')).toHaveText(/^\s*Anna\s*$/);
  await expect(page.getByText('1 Beobachtung')).toBeVisible();

  // Bleibt nach einem Neustart verborgen, bis es wieder eingeschaltet wird.
  await page.reload();
  await expect(schueler(page, 'Anna')).toHaveText(/^\s*Anna\s*$/);
  await page.getByRole('button', { name: 'Markierungen zeigen' }).click();
  await expect(schueler(page, 'Anna')).toContainText('+');
});

test('ein zurückgenommener Tipp hinterlässt keine offene Stunde', async ({ page }) => {
  await lerngruppeAnlegen(page);

  await schueler(page, 'Anna').click();
  await page.getByRole('button', { name: 'Rückgängig' }).click();
  await expect(page.getByText('Tippen beginnt die Stunde')).toBeVisible();

  await page.reload();
  await page.getByRole('link', { name: 'Stunden' }).click();
  await expect(page.getByText('Noch keine Stunden')).toBeVisible();
});

test('Abschluss ohne Beobachtung fragt nach', async ({ page }) => {
  await lerngruppeAnlegen(page);

  await page.getByRole('button', { name: 'Stunde abschließen' }).click();
  let frage = '';
  page.once('dialog', (d) => {
    frage = d.message();
    d.dismiss();
  });
  await page.getByRole('button', { name: 'Alle bestätigen' }).click();
  expect(frage).toContain('keine Leistung beobachtet');

  await page.getByRole('link', { name: 'Zurück' }).click();
  await page.getByRole('link', { name: 'Stunden' }).click();
  await expect(page.getByText('Noch keine Stunden')).toBeVisible();
});

test('Sicherung mit gespeichertem Passwort und Wiederherstellung auf neuem Gerät', async ({ page, browser }, info) => {
  await lerngruppeAnlegen(page);
  await schueler(page, 'Anna').click();
  await page.getByRole('button', { name: 'Stunde abschließen' }).click();
  await page.getByRole('button', { name: 'Alle bestätigen' }).click();

  await page.goto('./#/einstellungen');
  await page.getByLabel('Passwort', { exact: true }).first().fill('geheim123');
  await page.getByLabel('Passwort wiederholen').fill('geheim123');
  const datei = info.outputPath('sicherung.notenapp');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Passwort speichern und sichern' }).click();
  // Auf dem iPad muss die fertige Datei mit einem zweiten Tippen abgelegt werden.
  const ablegen = page.getByRole('button', { name: 'Datei ablegen …' });
  if (info.project.name === 'ipad') await ablegen.click();
  await (await download).saveAs(datei);

  // Das Passwort ist gemerkt: die nächste Sicherung braucht nur einen Tipp, auch nach einem Neustart.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Sicherung erstellen' })).toBeVisible();
  await page.getByRole('button', { name: 'Passwort anzeigen' }).click();
  await expect(page.getByText('geheim123')).toBeVisible();

  // Neues Gerät: leerer Speicher.
  const neu = await (await browser.newContext({ ...info.project.use, baseURL: 'http://localhost:4173/' })).newPage();
  await neu.goto('./#/einstellungen');
  await neu.locator('input[type=file]').setInputFiles(datei);
  await neu.getByLabel('Passwort', { exact: true }).last().fill('falsch');
  neu.once('dialog', (d) => d.accept());
  await neu.getByRole('button', { name: 'Wiederherstellen' }).click();
  await expect(neu.getByText('Falsches Passwort')).toBeVisible();

  await neu.getByLabel('Passwort', { exact: true }).last().fill('geheim123');
  neu.once('dialog', (d) => d.accept());
  await neu.getByRole('button', { name: 'Wiederherstellen' }).click();
  await expect(neu.getByRole('status')).toContainText('Sicherung wiederhergestellt');
  // Das Passwort der Sicherung gilt jetzt auch auf dem neuen Gerät.
  await expect(neu.getByRole('button', { name: 'Sicherung erstellen' })).toBeVisible();

  await neu.goto('./');
  await neu.getByRole('link', { name: /7a Mathe/ }).click();
  await neu.getByRole('link', { name: 'Noten' }).click();
  await neu.locator('select').first().selectOption('jahr');
  await expect(neu.getByRole('row', { name: /Müller, Anna/ })).toContainText('2,00');
});

test('ungültige Zahlen werden nicht gespeichert', async ({ page }) => {
  await page.goto('./#/einstellungen');
  const neutral = page.getByLabel('○');
  await neutral.fill('');
  await neutral.press('Tab');
  await expect(page.getByRole('status')).toContainText('Ungültiger Wert');
  await expect(neutral).toHaveValue('3');

  await neutral.fill('3.5');
  await neutral.press('Tab');
  await page.reload();
  await expect(page.getByLabel('○')).toHaveValue('3.5');
});

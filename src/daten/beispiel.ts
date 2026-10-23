// Erzeugt eine erfundene Lerngruppe mit Verlauf, um die App ohne echte Schülerdaten auszuprobieren.

import { alsDate, heute, plusTage, schuljahrVon, standardBeginnHj2 } from '../domain/datum';
import { sitzplanAus, verteile } from '../domain/sitzplan';
import type { Beobachtung, Eindruck, Leistungsnachweis, LeistungsStufe, Lerngruppe, Schueler, Stunde } from '../domain/typen';
import { vorschlag } from '../domain/vorschlag';
import { STANDARD_VERHALTENSKATEGORIEN } from './store.svelte';

const VORNAMEN = [
  'Mia', 'Ben', 'Emma', 'Leon', 'Hannah', 'Paul', 'Sofia', 'Finn', 'Lina', 'Elias', 'Ella', 'Noah', 'Clara',
  'Luis', 'Lea', 'Jonas', 'Marie', 'Tom', 'Amelie', 'Felix', 'Ida', 'Leon', 'Nele', 'Yusuf', 'Zeynep', 'Mats',
];
const NACHNAMEN = [
  'Wolf', 'Becker', 'Schulz', 'Meyer', 'Hoffmann', 'Koch', 'Richter', 'Klein', 'Neumann', 'Schwarz', 'Braun',
  'Zimmermann', 'Krüger', 'Hartmann', 'Lange', 'Werner', 'Krause', 'Lehmann', 'Köhler', 'Maier', 'Fuchs',
  'Schmitt', 'Vogel', 'Yilmaz', 'Demir', 'Jansen',
];

export function beispieldaten() {
  const id = () => crypto.randomUUID();
  const zufall = (n: number) => Math.floor(Math.random() * n);
  const heutiges = heute();
  const schuljahr = schuljahrVon(heutiges);

  const schueler: Schueler[] = VORNAMEN.map((vorname, i) => ({ id: id(), vorname, nachname: NACHNAMEN[i], klasse: '7a' }));
  // Jeder Schüler bekommt eine „Beteiligung“ zwischen 0 und 1.
  const beteiligung = new Map(schueler.map((s) => [s.id, Math.random()]));

  const kategorien = STANDARD_VERHALTENSKATEGORIEN.map((k) => ({ ...k, id: id() }));
  const ka = { id: id(), name: 'Klassenarbeiten', gewicht: 50, art: 'nachweise' as const };
  const lg: Lerngruppe = {
    id: id(),
    name: '7a Mathe (Beispiel)',
    fach: 'Mathe',
    schuljahr,
    beginnHj2: standardBeginnHj2(schuljahr),
    anteilHj1: 0.5,
    notenbereiche: [ka, { id: id(), name: 'Mündliche Note', gewicht: 50, art: 'muendlich' }],
    verhaltenskategorien: kategorien,
    mitglieder: schueler.map((s) => ({ schuelerId: s.id, ausgeschieden: false })),
    sitzplan: verteile(sitzplanAus('reihen', schueler.length), schueler.map((s) => s.id)),
    zeugnisnoten: { hj1: {}, jahr: {} },
    archiviert: false,
    zuletztBenutzt: Date.now(),
  };

  // Stunden an Montagen, Mittwochen und Freitagen der letzten sechs Wochen; freitags Doppelstunde.
  const stunden: Stunde[] = [];
  const beobachtungen: Beobachtung[] = [];
  for (let t = 42; t >= 1; t--) {
    const datum = plusTage(heutiges, -t);
    const tag = alsDate(datum).getDay();
    if (![1, 3, 5].includes(tag)) continue;
    const stunde: Stunde = { id: id(), lerngruppeId: lg.id, datum, gewicht: tag === 5 ? 2 : 1, abgeschlossen: true, eindruecke: {} };
    const zeit = alsDate(datum).getTime() + 9 * 3600_000;
    for (const s of schueler) {
      if (Math.random() < 0.05) {
        stunde.eindruecke[s.id] = { art: 'abwesend' };
        continue;
      }
      const b = beteiligung.get(s.id)!;
      const stufen: LeistungsStufe[] = [];
      for (let i = 0; i < 4; i++) {
        const r = Math.random();
        if (r < b * 0.35) stufen.push(Math.random() < 0.2 ? '++' : '+');
        else if (r > 0.985 - (1 - b) * 0.04) stufen.push('-');
      }
      for (const stufe of stufen) beobachtungen.push({ id: id(), stundeId: stunde.id, lerngruppeId: lg.id, schuelerId: s.id, zeit, art: 'leistung', stufe });
      if (Math.random() < 0.06) {
        const k = kategorien[zufall(kategorien.length)];
        beobachtungen.push({ id: id(), stundeId: stunde.id, lerngruppeId: lg.id, schuelerId: s.id, zeit, art: 'verhalten', kategorieId: k.id });
      }
      const eindruck: Eindruck = { art: 'stufe', stufe: vorschlag(stufen, { schwellePlusPlus: 3, schwelleMinusMinus: -3 }) };
      stunde.eindruecke[s.id] = eindruck;
    }
    stunden.push(stunde);
  }

  // Ein Schüler mit auffällig oft fehlenden Hausaufgaben, damit ein Häufungshinweis erscheint.
  const ha = kategorien.find((k) => k.name === 'Hausaufgaben fehlen')!;
  const ben = schueler[1];
  for (const s of stunden.slice(-3)) {
    beobachtungen.push({ id: id(), stundeId: s.id, lerngruppeId: lg.id, schuelerId: ben.id, zeit: alsDate(s.datum).getTime() + 9 * 3600_000, art: 'verhalten', kategorieId: ha.id });
  }

  const tendenz = ['', '+', '-'];
  const ka1: Leistungsnachweis = {
    id: id(),
    lerngruppeId: lg.id,
    notenbereichId: ka.id,
    titel: 'Klassenarbeit 1',
    datum: plusTage(heutiges, -20),
    gewicht: 1,
    noten: Object.fromEntries(
      schueler.map((s) => {
        const basis = Math.min(6, Math.max(1, Math.round(4.5 - beteiligung.get(s.id)! * 3 + (Math.random() - 0.5) * 1.5)));
        return [s.id, `${basis}${tendenz[zufall(3)]}`.replace('1+', '1').replace('6-', '6')];
      }),
    ),
  };

  return { schueler, lerngruppen: [lg], stunden, beobachtungen, nachweise: [ka1] };
}

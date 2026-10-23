# Noten-App

Mündliche Leistungen im Unterricht per Sitzplan erfassen und daraus Noten berechnen. Alle Daten bleiben auf dem Gerät. Begriffe: [CONTEXT.md](CONTEXT.md), Grundsatzentscheidung: [docs/adr](docs/adr).

## Starten auf dem Laptop

Doppelklick auf **`App starten.bat`**. Der Browser öffnet `http://localhost:5173`. Das schwarze Fenster offen lassen, solange du die App nutzt.

Zum Ausprobieren: auf der Startseite **„Beispiel-Lerngruppe erzeugen“** (nur erfundene Schüler).

## Auf dem iPad (Phase 2)

1. In **Safari** öffnen: https://davidewaldzehen.github.io/noten-app/
2. **Teilen → Zum Home-Bildschirm**. Ab jetzt nur noch über das Symbol „Noten“ starten. Die App läuft dann auch ohne Internet.
3. Daten nur in der App vom Home-Bildschirm eintragen: Safari-Tab und Home-Bildschirm-App haben getrennte Speicher, und Safari kann Daten normaler Webseiten nach 7 Tagen ohne Besuch löschen.
4. Regelmäßig **Einstellungen → Sicherung** und die Datei „In Dateien sichern“ (z. B. iCloud Drive). Das Passwort legst du beim ersten Mal fest, danach merkt sich die App es. **Schreib es auf:** Ohne Passwort lässt sich die Sicherung auf einem neuen Gerät nicht öffnen.

Veröffentlicht wird nur der Programmcode. Alles, was du einträgst, bleibt auf dem iPad. Neue Versionen kommen automatisch, sobald das iPad online ist, und gelten ab dem nächsten Start der App.

## Bedienung im Unterricht

- **Tippen** auf einen Schüler: guter Beitrag (+). Unten erscheint 3 Sekunden „Rückgängig“.
- **Lange drücken** (mit der Maus: gedrückt halten): ++, − oder eine Verhaltensbeobachtung.
- **Stunde abschließen**: Vorschlag prüfen, einzelne Schüler antippen zum Ändern (auch „abwesend“), dann „Alle bestätigen“.

## Sitzplan einrichten

Reiter **Sitzplan → Plätze bearbeiten**:

- **Anordnung wählen …**: Reihen, Einzeltische, U-Form, Doppel-U, 4er-/6er-Gruppen, Stuhlkreis oder leer, mit beliebig vielen Plätzen.
- **Zeichnen**: über leere Felder wischen legt Plätze an, über Plätze wischen entfernt sie. Am Rand ist immer ein Feld frei, so wächst der Plan in jede Richtung.
- **Auswählen**: Plätze antippen oder darüberwischen, dann mit den Pfeilen verschieben (z. B. einen ganzen Gruppentisch). Schüler wandern mit.
- **Rückgängig** nimmt jede Änderung am Sitzplan zurück.

## Für Entwickler

```
npm install
npm run dev      # lokaler Server
npm test         # Tests der Notenberechnung und Datenhaltung
npm run test:e2e # klickt die gebaute App im Browser durch (Safari-Engine als iPad und Chromium)
npm run check    # Typprüfung
npm run build    # fertige Dateien in dist/
```

Vor jeder Veröffentlichung laufen Typprüfung und beide Testarten; schlägt etwas fehl, bleibt die alte Version online.

Ändert sich die Form der gespeicherten Daten, `DATENVERSION` in `src/daten/migration.ts` erhöhen und dort einen Umwandlungsschritt ergänzen. So bleiben vorhandene Daten und alte Sicherungen lesbar.

Ideen für später: [docs/ideen.md](docs/ideen.md).

Aufbau: `src/domain` (Fachlogik, getestet, ohne Oberfläche), `src/daten` (lokale Datenbank, Sicherung), `src/ui` (Svelte-Oberfläche).

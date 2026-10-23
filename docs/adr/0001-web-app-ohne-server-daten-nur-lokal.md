# Web-App ohne Server, Daten nur lokal auf dem Gerät

Die App ist eine installierbare Web-App ohne jede Server-Komponente: alle Schülerdaten liegen ausschließlich im Browser-Speicher des Geräts (iPad), es gibt keine Konten und keine Synchronisierung. Gewählt, weil die App dauerhaft kostenlos sein soll, Schülerdaten auf privaten Geräten in Niedersachsen datenschutzrechtlich heikel sind und ein Server der teuerste und riskanteste Teil wäre. Gegen Datenverlust schützt nur eine verschlüsselte Sicherungsdatei, die die Lehrkraft selbst ablegt.

## Considered Options

- **Native iOS-App** — verworfen: braucht einen Mac mit Xcode (User hat Windows) oder 99 €/Jahr für den App Store.
- **Lokale HTML-Datei auf dem iPad** — verworfen: iOS zeigt sie nur als Vorschau, dauerhafte Speicherung ist nicht möglich.
- **Server mit Synchronisierung iPad ↔ Laptop** — vertagt: erst wenn sich der Prototyp im Unterricht bewährt hat.

## Consequences

- Phase 1 läuft nur lokal auf dem Laptop (`localhost`) mit erfundenen Schülern. Phase 2 legt ausschließlich den Programmcode auf ein kostenloses statisches Hosting (z. B. GitHub Pages); das iPad lädt ihn einmal und läuft danach offline.
- Daten auf iPad und Laptop sind voneinander getrennt. Eine spätere Synchronisierung muss nachgerüstet werden.

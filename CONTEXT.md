# Noten-App

Hilft einer Lehrkraft, Leistungen von Schülern während des Unterrichts über einen Sitzplan schnell zu erfassen und daraus am Ende Noten zu berechnen.

## Language

### Organisation

**Lerngruppe**:
Eine feste Gruppe von Schülern, die die Lehrkraft in einem Fach unterrichtet (z. B. „7a Mathe“, „WPK Französisch 7“). Die Einheit, für die erfasst und benotet wird.
_Avoid_: Kurs, Klasse (wenn die Unterrichtsgruppe gemeint ist)

**Schüler**:
Eine Person, die in einer oder mehreren Lerngruppen ist. Existiert nur einmal, auch wenn sie in mehreren Lerngruppen der Lehrkraft ist.
_Avoid_: Kind, Student

**Klasse**:
Die Stammklasse eines Schülers (z. B. „7a“). Nur eine Eigenschaft des Schülers zum Sortieren und Importieren, keine Bewertungseinheit.

**Fach**:
Das Unterrichtsfach einer Lerngruppe (z. B. Mathe, Englisch).

**Sitzplan**:
Die räumliche Anordnung der Schüler einer Lerngruppe im Klassenraum. Jede Lerngruppe hat genau einen Sitzplan.
_Avoid_: Raumplan, Klassenplan

**Platz**:
Eine Stelle im Sitzplan, an der höchstens ein Schüler sitzt. Ein Schüler hat in einer Lerngruppe höchstens einen Platz; Umsetzen ändert den Sitzplan dauerhaft.
_Avoid_: Sitz, Tisch

### Erfassung

**Beobachtung**:
Ein Eintrag, den die Lehrkraft während oder kurz nach dem Unterricht zu einem Schüler macht. Entweder eine Leistungsbeobachtung oder eine Verhaltensbeobachtung.
_Avoid_: Feedback, Bewertung, Eintrag

**Stunde**:
Eine Unterrichtseinheit einer Lerngruppe an einem Datum. Rahmen für alle Beobachtungen und Stundeneindrücke darin. Hat ein Gewicht (Einzelstunde 1, Doppelstunde 2), mit dem ihre Stundeneindrücke in die Mündliche Note eingehen.
_Avoid_: Sitzung, Termin

**Offene Stunde**:
Eine Stunde, deren Stundenabschluss noch nicht erfolgt ist. Muss abgeschlossen werden, bevor in der Lerngruppe eine neue Stunde beginnt.

**Leistungsbeobachtung**:
Eine schnelle Beobachtung während einer Stunde über die fachliche Leistung eines Schülers (z. B. ein guter Beitrag). Dient nur als Grundlage für den Vorschlag zum Stundeneindruck, nicht direkt für die Fachnote. Stufen: **+** (guter Beitrag), **++** (herausragender, weiterführender Beitrag), **−** (konnte nicht leisten, z. B. aufgerufen und keine Antwort). Eine falsche Antwort nach eigener Meldung ist kein −.
_Avoid_: Meldung, Plus, Tipp

**Stundeneindruck**:
Die von der Lehrkraft bestätigte Einschätzung der Leistung eines Schülers in einer Stunde, auf der Stufenskala ++ / + / ○ / − / −− (höchstens einer pro Schüler und Stunde). Die Grundlage, aus der die mündliche Note berechnet wird.
_Avoid_: Stundennote, Tagesnote

**Mündliche Note**:
Die aus den Stundeneindrücken eines Schülers in einer Lerngruppe berechnete Note (nach Gewicht der Stunde gewichteter Durchschnitt, jede Stufe entspricht einem Notenwert).
_Avoid_: Mitarbeitsnote, Stundennote

**Notenbereich**:
Ein gewichteter Teil der Fachnote einer Lerngruppe (z. B. Klassenarbeiten, Mündliche Note, Tests). Seine Note ist der gewichtete Durchschnitt seiner Leistungsnachweise bzw. bei der Mündlichen Note der Stundeneindrücke.
_Avoid_: Kategorie, Säule

**Leistungsnachweis**:
Eine einzelne eingetragene Leistung mit einer Note pro Schüler und einem eigenen Gewicht innerhalb ihres Notenbereichs (z. B. „Klassenarbeit 2“, „Vokabeltest 15.10.“).
_Avoid_: Prüfung, Arbeit, Einzelnote

**Tendenz**:
Ein + oder − an der Note eines Leistungsnachweises (z. B. 2−). Zählt in der Rechnung als ±0,3 (2+ = 1,7; 2− = 2,3). Zeugnisnoten haben keine Tendenz.

**Sicherung**:
Eine mit Passwort verschlüsselte Datei mit allen Daten der App, aus der sich der vollständige Stand wiederherstellen lässt.
_Avoid_: Backup, Export (Export meint Ausgaben für Menschen, nicht zur Wiederherstellung)

**Notenübersicht**:
Eine druckbare Übersicht einer Lerngruppe für einen Bewertungszeitraum: pro Schüler die Noten der Notenbereiche, die Fachnote und die Zeugnisnote. Vorlage zum Übertragen nach WebUntis und für die Zeugniskonferenz.

**Schülerbericht**:
Eine druckbare Seite zu einem Schüler in einer Lerngruppe: Verlauf der Stundeneindrücke, Leistungsnachweise, Verhaltensbeobachtungen, Notizen und Begründung der Zeugnisnote. Unterlage für Elterngespräche.
_Avoid_: Schülerprofil, Akte

**Notiz**:
Ein datierter Freitext der Lehrkraft zu einem Schüler in einer Lerngruppe (z. B. Elterngespräch, Förderplan, Absprache). Erscheint im Schülerbericht und fließt nie in die Note ein.
_Avoid_: Kommentar, Bemerkung, Beobachtung (das ist ein Eintrag aus dem Unterricht)

**Fachvorlage**:
Die Standard-Notenbereiche und -gewichte eines Fachs, die neue Lerngruppen dieses Fachs übernehmen.

**Fachnote**:
Die aus den gewichteten Notenbereichen berechnete Gesamtnote eines Schülers in einer Lerngruppe. Fehlt einem Schüler ein Notenbereich ganz, wird er herausgerechnet.
_Avoid_: Endnote, Gesamtnote

**Schuljahr**:
Der Zeitraum, für den eine Lerngruppe besteht. Nach Ende des Schuljahres wird die Lerngruppe archiviert oder ins neue Schuljahr übernommen: Dabei entsteht eine neue Lerngruppe mit denselben Schülern, demselben Sitzplan, denselben Notenbereichen und Verhaltenskategorien, aber ohne Stunden, Beobachtungen, Leistungsnachweise, Zeugnisnoten und Notizen; die alte wird archiviert.

**Bewertungszeitraum**:
Das 1. oder 2. Halbjahr eines Schuljahres, getrennt durch ein Stichdatum. Jede Stunde und jeder Leistungsnachweis gehört über sein Datum zu genau einem Bewertungszeitraum.
_Avoid_: Periode, Semester

**Halbjahresnote**:
Die Fachnote, berechnet nur aus dem 1. Halbjahr.

**Jahresnote**:
Die Fachnote für das ganze Schuljahr: gewichtete Mischung der Fachnoten beider Halbjahre (Anteil des 1. Halbjahres einstellbar).
_Avoid_: Endnote, Zeugnisnote (wenn die berechnete Note gemeint ist)

**Zeugnisnote**:
Die ganze Note, die die Lehrkraft für einen Schüler am Ende eines Bewertungszeitraums festlegt. Die gerundete Fachnote ist nur ein Vorschlag dafür; Abweichungen können eine kurze Begründung haben.
_Avoid_: Endnote

**Grenzfall**:
Ein Schüler, dessen berechnete Fachnote nahe an der Grenze zwischen zwei ganzen Noten liegt (z. B. x,4 bis x,6) und deshalb zur bewussten Prüfung markiert wird.

**Neutraler Eindruck (○)**:
Die Stufe „anwesend, unauffällig“. Vorbelegung für jeden anwesenden Schüler ohne Leistungsbeobachtung in der Stunde. Zählt wie jeder andere Stundeneindruck.

**Ohne Eindruck**:
Status eines anwesenden Schülers, dessen Leistung in der Stunde nicht beurteilbar war. Die Stunde zählt für ihn nicht.
_Avoid_: neutral (das ist ○)

**Abwesend**:
Status eines Schülers, der in der Stunde nicht da war. Wird nur beim Stundenabschluss gesetzt; die Stunde zählt für ihn nicht.
_Avoid_: Fehlzeit, krank

**Stundenabschluss**:
Der Schritt am Ende einer Stunde, in dem die Lehrkraft die aus den Leistungsbeobachtungen vorgeschlagenen Stundeneindrücke prüft, korrigiert und bestätigt.
_Avoid_: Auswertung, Stundenende

**Verhaltensbeobachtung**:
Eine Beobachtung über das Arbeits- oder Sozialverhalten eines Schülers (z. B. stört, Material fehlt). Fließt nie in die Fachnote ein und erscheint nicht im Stundenabschluss.
_Avoid_: Störung (als Oberbegriff), Minus

**Verhaltenskategorie**:
Eine von der Lehrkraft pro Lerngruppe festgelegte Art von Verhaltensbeobachtung, positiv oder negativ (vorbelegt: stört, Material fehlt, Hausaufgaben fehlen, nicht bei der Sache, hilft anderen).

**Häufungshinweis**:
Ein Hinweis an die Lehrkraft, dass bei einem Schüler dieselbe Verhaltenskategorie innerhalb eines Zeitraums auffällig oft beobachtet wurde.
_Avoid_: Warnung, Alarm

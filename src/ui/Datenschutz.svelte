<script lang="ts">
  import { PASSWORT_MINDESTLAENGE, VERSCHLUESSELUNG } from '../daten/sicherung';
  import { heute, langdatum } from '../domain/datum';
  import Kopf from './Kopf.svelte';

  const adresse = location.href.split('#')[0];
  const v = VERSCHLUESSELUNG;
</script>

<Kopf titel="Datenschutz" zurueck="#/einstellungen">
  {#snippet aktionen()}
    <button onclick={() => window.print()}>Drucken / PDF</button>
  {/snippet}
</Kopf>

<article class="seite stapel">
  <div>
    <h1>Datenschutz-Informationen zur Noten-App</h1>
    <p class="leise">Stand {langdatum(heute())}. Diese Seite beschreibt, wie die App mit Daten umgeht. Sie ist keine rechtliche Bewertung.</p>
  </div>

  <section class="karte">
    <h2>Zweck</h2>
    <p>
      Die App hilft einer Lehrkraft, Leistungen ihrer Schüler während des Unterrichts über einen Sitzplan zu erfassen und daraus Noten zu
      berechnen. Sie wird von einer einzelnen Lehrkraft auf ihrem eigenen Gerät benutzt.
    </p>
  </section>

  <section class="karte">
    <h2>Welche Daten gespeichert werden</h2>
    <ul>
      <li><strong>Schüler:</strong> Vorname, Nachname, Klasse.</li>
      <li><strong>Lerngruppen:</strong> Name, Fach, Schuljahr, zugehörige Schüler, Sitzplan, Notenbereiche mit Gewichten, Verhaltenskategorien.</li>
      <li><strong>Stunden:</strong> Datum, Einzel- oder Doppelstunde und je Schüler ein Stundeneindruck (++ bis −−), „ohne Eindruck“ oder „abwesend“.</li>
      <li>
        <strong>Beobachtungen</strong> während der Stunde mit Uhrzeit: Leistungsbeobachtungen (++, +, −) und Verhaltensbeobachtungen (z. B.
        „stört“, „Material fehlt“, „hilft anderen“). Verhaltensbeobachtungen fließen nicht in Noten ein.
      </li>
      <li><strong>Leistungsnachweise:</strong> Titel, Datum, Gewicht und je Schüler die Note, bei Klassenarbeiten mit Notenschlüssel auch die Punkte.</li>
      <li><strong>Zeugnisnoten</strong> mit einer freiwilligen Begründung bei Abweichung von der berechneten Note.</li>
      <li><strong>Notizen:</strong> Freitext der Lehrkraft zu einem Schüler mit Datum (z. B. Elterngespräch, Absprachen).</li>
      <li><strong>Einstellungen</strong> der App und das Passwort für Sicherungen.</li>
    </ul>
    <p>Die App hat keine Felder für Anschrift, Geburtsdatum, Fotos, Kontaktdaten oder Angaben zu Eltern.</p>
  </section>

  <section class="karte">
    <h2>Wo die Daten liegen</h2>
    <ul>
      <li>
        Alle Daten liegen ausschließlich im Speicher des Browsers auf dem Gerät, auf dem die App benutzt wird (IndexedDB). Es gibt kein
        Benutzerkonto und keinen Server, der die Daten empfängt.
      </li>
      <li>
        Die App überträgt keine eingetragenen Daten über das Internet. Sie enthält keine Werbung, keine Statistik- oder Analysedienste und lädt
        keine Inhalte von fremden Servern (auch keine Schriften).
      </li>
      <li>
        Aus dem Internet lädt die App nur ihren eigenen Programmcode von <span class="zahl">{adresse}</span>: beim ersten Öffnen und
        später neue Versionen; dazu fragt das Gerät beim Start nach, wenn es online ist. Der Server erhält dabei wie bei jedem Seitenaufruf technische Verbindungsdaten (z. B. die IP-Adresse), aber
        keine Schülerdaten. Danach läuft die App auch ohne Internet.
      </li>
      <li>
        Die App verschlüsselt die Daten auf dem Gerät nicht selbst; sie sind durch die Gerätesperre geschützt. Das Gerät braucht deshalb einen
        Code (auf dem iPad zusammen mit Face ID oder Touch ID möglich). Mit gesetztem Code verschlüsselt iPadOS den Gerätespeicher.
      </li>
      <li>Das Sicherungspasswort ist auf dem Gerät gespeichert, damit eine Sicherung nur einen Tipp braucht. Es steckt nicht in der Sicherungsdatei.</li>
    </ul>
  </section>

  <section class="karte">
    <h2>Sicherung</h2>
    <ul>
      <li>Sicherungen erstellt die Lehrkraft von Hand. Eine Sicherung ist eine Datei mit allen Daten der App.</li>
      <li>
        Die Datei ist verschlüsselt mit {v.verfahren.replace('-', `-${v.schluesselBits}-`)}. Der Schlüssel
        wird mit {v.ableitung} ({v.hash}, {v.iterationen.toLocaleString('de-DE')} Durchläufe, zufälliger Salt je Datei) aus einem Passwort mit
        mindestens {PASSWORT_MINDESTLAENGE} Zeichen abgeleitet. Ohne das Passwort lässt sich die Datei nicht öffnen.
      </li>
      <li>Wo die Datei abgelegt wird (z. B. in der „Dateien“-App, in iCloud Drive oder auf einem USB-Stick), entscheidet die Lehrkraft.</li>
    </ul>
  </section>

  <section class="karte">
    <h2>Ausdrucke und Exporte</h2>
    <p>
      Notenübersicht und Schülerbericht lassen sich drucken oder als PDF speichern, die Notenübersicht auch als CSV-Datei. Diese Ausgaben sind
      nicht verschlüsselt.
    </p>
  </section>

  <section class="karte">
    <h2>Löschen</h2>
    <ul>
      <li>
        Beim Löschen einer Lerngruppe werden ihre Stunden, Beobachtungen, Leistungsnachweise, Zeugnisnoten und Notizen gelöscht, ebenso Schüler,
        die in keiner anderen Lerngruppe sind.
      </li>
      <li>Archivierte Lerngruppen lassen sich in den Einstellungen gesammelt endgültig löschen.</li>
      <li>Sicherungsdateien und Ausdrucke liegen außerhalb der App und müssen gesondert gelöscht werden.</li>
    </ul>
  </section>

  <section class="karte">
    <h2>Am Beamer</h2>
    <p>
      Wird das Gerät an einen Beamer gespiegelt, blendet „Markierungen verbergen“ im Unterricht alle Beobachtungen am Sitzplan, die Meldungen
      nach einer Eingabe und auf der Startseite die Hinweise zu einzelnen Schülern aus. Sichtbar bleiben die Namen im Sitzplan.
    </p>
  </section>
</article>

<style>
  article {
    max-width: 860px;
  }

  h1 {
    margin-bottom: 0.2rem;
  }

  ul {
    margin: 0;
    padding-left: 1.2rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  section p {
    margin: 0.4rem 0 0;
  }

  @media print {
    .karte {
      break-inside: avoid;
    }
  }
</style>

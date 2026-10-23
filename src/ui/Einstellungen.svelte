<script lang="ts">
  import { beispieldaten } from '../daten/beispiel';
  import { istIos, speichereDatei } from '../daten/export';
  import { SicherungsFehler } from '../daten/sicherung';
  import {
    daten,
    datenHinzufuegen,
    lerngruppeLoeschen,
    sicherungErstellen,
    sicherungWiederherstellen,
    speichereEinstellungen,
    zeigeSnackbar,
  } from '../daten/store.svelte';
  import { datumVon, heute, langdatum } from '../domain/datum';
  import { STUFEN } from '../domain/typen';
  import { STUFEN_ANZEIGE } from '../domain/vorschlag';
  import Kopf from './Kopf.svelte';
  import { stufenKlasse } from './stufen';

  // abgeleitet, weil Wiederherstellen das ganze Einstellungsobjekt ersetzt
  const e = $derived(daten.einstellungen);

  // Sicherung erstellen
  let passwort = $state('');
  let passwort2 = $state('');
  let arbeitet = $state(false);
  /** Fertig verschlüsselte Sicherung, die auf dem iPad noch per Tippen abgelegt werden muss. */
  let bereit = $state<string | null>(null);

  async function sichern() {
    if (passwort.length < 6 || passwort !== passwort2) return;
    arbeitet = true;
    try {
      const datei = await sicherungErstellen(passwort);
      passwort = passwort2 = '';
      // Das Verschlüsseln dauert etwas; danach erlaubt Safari das Teilen-Menü nur nach einem neuen Tippen.
      if (istIos) bereit = datei;
      else ablegen(datei);
    } finally {
      arbeitet = false;
    }
  }

  function ablegen(datei: string) {
    speichereDatei(datei, `noten-sicherung-${heute()}.notenapp`, 'application/octet-stream');
    bereit = null;
    zeigeSnackbar('Sicherung erstellt. Leg die Datei an einem sicheren Ort ab.', undefined, 5000);
  }

  // Wiederherstellen
  let datei = $state<File | null>(null);
  let passwortWieder = $state('');
  let fehlerWieder = $state('');

  async function wiederherstellen() {
    if (!datei) return;
    if (!confirm('ALLE aktuellen Daten in der App werden durch den Stand der Sicherung ersetzt. Fortfahren?')) return;
    arbeitet = true;
    fehlerWieder = '';
    try {
      await sicherungWiederherstellen(await datei.text(), passwortWieder);
      zeigeSnackbar('Sicherung wiederhergestellt.');
      passwortWieder = '';
      datei = null;
    } catch (err) {
      fehlerWieder = err instanceof SicherungsFehler ? err.message : `Fehler: ${err}`;
    } finally {
      arbeitet = false;
    }
  }

  async function beispiel() {
    await datenHinzufuegen(beispieldaten());
    zeigeSnackbar('Beispiel-Lerngruppe angelegt.');
  }

  const archiv = $derived(daten.lerngruppen.filter((l) => l.archiviert));

  async function archivLoeschen() {
    if (!confirm(`${archiv.length} archivierte Lerngruppe(n) mit allen Daten endgültig löschen?`)) return;
    for (const lg of archiv) await lerngruppeLoeschen(lg.id);
    zeigeSnackbar('Archiv gelöscht.');
  }

  function zahl(feld: 'schwellePlusPlus' | 'schwelleMinusMinus' | 'haeufungAnzahl' | 'haeufungTage' | 'grenzfallBreite', wert: string) {
    const n = Number(wert.replace(',', '.'));
    if (Number.isFinite(n)) {
      e[feld] = n;
      speichereEinstellungen();
    }
  }
</script>

<Kopf titel="Einstellungen" />

<div class="seite stapel">
  <section class="karte stapel">
    <h2>Sicherung</h2>
    <p>
      Alle Daten liegen nur auf diesem Gerät. Erstelle regelmäßig eine Sicherung und leg die Datei an einem sicheren Ort ab (z. B. in der
      „Dateien“-App oder auf einem USB-Stick). Die Datei ist mit deinem Passwort verschlüsselt – <strong>ohne Passwort lässt sie sich nicht öffnen, auch nicht von dir.</strong>
    </p>
    <p class="leise">
      Letzte Sicherung: {e.letzteSicherung ? langdatum(datumVon(new Date(e.letzteSicherung))) : 'noch nie'}
    </p>
    <div class="zeile unten">
      <label>Passwort <input type="password" bind:value={passwort} autocomplete="new-password" /></label>
      <label>Passwort wiederholen <input type="password" bind:value={passwort2} autocomplete="new-password" /></label>
      <button class="primaer" onclick={sichern} disabled={arbeitet || passwort.length < 6 || passwort !== passwort2}>
        {arbeitet ? 'Verschlüssele …' : 'Sicherung herunterladen'}
      </button>
    </div>
    {#if bereit}
      {@const datei = bereit}
      <p class="hinweis zeile">
        Sicherung ist verschlüsselt.
        <button class="primaer" onclick={() => ablegen(datei)}>Datei ablegen …</button>
        <span class="leise">Im Menü „In Dateien sichern“ wählen, am besten in iCloud Drive.</span>
      </p>
    {/if}
    {#if passwort && passwort.length < 6}<p class="leise">Mindestens 6 Zeichen.</p>{/if}
    {#if passwort2 && passwort !== passwort2}<p class="leise">Die Passwörter stimmen nicht überein.</p>{/if}

    <h3>Wiederherstellen</h3>
    <div class="zeile unten">
      <label>Sicherungsdatei <input type="file" onchange={(ev) => (datei = ev.currentTarget.files?.[0] ?? null)} /></label>
      <label>Passwort <input type="password" bind:value={passwortWieder} /></label>
      <button onclick={wiederherstellen} disabled={arbeitet || !datei || !passwortWieder}>Wiederherstellen</button>
    </div>
    {#if fehlerWieder}<p class="fehler">{fehlerWieder}</p>{/if}
  </section>

  <section class="karte stapel">
    <h2>Mündliche Note</h2>
    <p class="leise">Welche Note entspricht welchem Stundeneindruck? Gilt für alle Lerngruppen.</p>
    <div class="zeile">
      {#each STUFEN as s}
        <label class={stufenKlasse(s)}>
          <span class="stufe">{STUFEN_ANZEIGE[s]}</span>
          <input
            class="kurz"
            type="number"
            min="1"
            max="6"
            step="0.5"
            bind:value={e.stufenNoten[s]}
            onchange={speichereEinstellungen}
          />
        </label>
      {/each}
    </div>

    <h3>Vorschlag beim Stundenabschluss</h3>
    <p class="leise">Punkte pro Stunde: ++ = 2, + = 1, − = −1. Keine Beobachtung ergibt ○.</p>
    <div class="zeile">
      <label>++ ab Punkten <input class="kurz" type="number" min="1" value={e.schwellePlusPlus} onchange={(ev) => zahl('schwellePlusPlus', ev.currentTarget.value)} /></label>
      <label>−− ab Punkten <input class="kurz" type="number" max="-1" value={e.schwelleMinusMinus} onchange={(ev) => zahl('schwelleMinusMinus', ev.currentTarget.value)} /></label>
    </div>
  </section>

  <section class="karte stapel">
    <h2>Hinweise</h2>
    <div class="zeile">
      <label>Häufungshinweis ab <input class="kurz" type="number" min="2" value={e.haeufungAnzahl} onchange={(ev) => zahl('haeufungAnzahl', ev.currentTarget.value)} /></label>
      <label>innerhalb von Tagen <input class="kurz" type="number" min="1" value={e.haeufungTage} onchange={(ev) => zahl('haeufungTage', ev.currentTarget.value)} /></label>
      <label>Grenzfall: Abstand zu x,5 <input class="kurz" type="number" min="0" max="0.5" step="0.05" value={e.grenzfallBreite} onchange={(ev) => zahl('grenzfallBreite', ev.currentTarget.value)} /></label>
    </div>
  </section>

  <section class="karte stapel">
    <h2>Ausprobieren und Aufräumen</h2>
    <div class="zeile">
      <button onclick={beispiel}>Beispiel-Lerngruppe erzeugen</button>
      <button class="gefahr" onclick={archivLoeschen} disabled={archiv.length === 0}>Archiv endgültig löschen ({archiv.length})</button>
    </div>
    <p class="leise">Die Beispiel-Lerngruppe enthält nur erfundene Schüler. Wie lange archivierte Noten aufbewahrt werden müssen, klärt die Schulleitung.</p>
  </section>
</div>

<style>
  .unten {
    align-items: flex-end;
  }

  .kurz {
    width: 100px;
  }

  .stufe {
    font-weight: 700;
    font-size: 1.2rem;
    color: var(--s);
  }

  .fehler {
    color: var(--gefahr);
    font-weight: 600;
  }
</style>

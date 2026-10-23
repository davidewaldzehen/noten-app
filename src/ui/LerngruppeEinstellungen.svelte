<script lang="ts">
  import { daten, fachvorlageSpeichern, lerngruppeLoeschen, neueId, speichereLerngruppe, zeigeSnackbar } from '../daten/store.svelte';
  import type { Lerngruppe, Notenbereich } from '../domain/typen';
  import Kopf from './Kopf.svelte';
  import { geheZu } from './router.svelte';

  let { lg }: { lg: Lerngruppe } = $props();

  const summe = $derived(lg.notenbereiche.reduce((s, b) => s + (Number(b.gewicht) || 0), 0));
  const hatMuendlich = $derived(lg.notenbereiche.some((b) => b.art === 'muendlich'));

  function speichern() {
    speichereLerngruppe(lg);
  }

  function prozent(b: Notenbereich) {
    return summe > 0 ? Math.round(((Number(b.gewicht) || 0) / summe) * 100) : 0;
  }

  function bereichNeu(art: Notenbereich['art']) {
    lg.notenbereiche.push({ id: neueId(), name: art === 'muendlich' ? 'Mündliche Note' : 'Tests', gewicht: 10, art });
    speichern();
  }

  function bereichLoeschen(b: Notenbereich) {
    const anzahl = daten.nachweise.filter((n) => n.notenbereichId === b.id).length;
    if (anzahl > 0) {
      alert(`„${b.name}“ enthält noch ${anzahl} Leistungsnachweis(e). Lösche oder verschiebe sie zuerst.`);
      return;
    }
    if (!confirm(`Notenbereich „${b.name}“ entfernen?`)) return;
    lg.notenbereiche = lg.notenbereiche.filter((x) => x.id !== b.id);
    speichern();
  }

  function alsVorlage() {
    fachvorlageSpeichern(lg.fach, lg.notenbereiche);
    zeigeSnackbar(`Fachvorlage „${lg.fach}“ gespeichert. Neue Lerngruppen in ${lg.fach} übernehmen diese Notenbereiche.`, undefined, 4000);
  }

  function kategorieNeu() {
    lg.verhaltenskategorien.push({ id: neueId(), name: 'Neue Kategorie', symbol: '•', positiv: false });
    speichern();
  }

  function kategorieLoeschen(id: string) {
    const anzahl = daten.beobachtungen.filter((b) => b.art === 'verhalten' && b.kategorieId === id).length;
    if (!confirm(anzahl ? `Kategorie entfernen? ${anzahl} vorhandene Beobachtungen werden dann nicht mehr angezeigt.` : 'Kategorie entfernen?')) return;
    lg.verhaltenskategorien = lg.verhaltenskategorien.filter((k) => k.id !== id);
    speichern();
  }

  function archivieren() {
    lg.archiviert = !lg.archiviert;
    speichern();
    zeigeSnackbar(lg.archiviert ? 'Lerngruppe archiviert.' : 'Lerngruppe wieder aktiv.');
  }

  async function loeschen() {
    if (!confirm(`„${lg.name}“ mit ALLEN Stunden, Beobachtungen und Noten endgültig löschen? Das lässt sich nicht rückgängig machen.`)) return;
    const name = lg.name;
    geheZu('');
    await lerngruppeLoeschen(lg.id);
    zeigeSnackbar(`„${name}“ gelöscht.`);
  }
</script>

<Kopf titel={lg.name} {lg} aktiv="einstellungen" />

<div class="seite stapel">
  <section class="karte stapel">
    <h2>Allgemein</h2>
    <div class="felder">
      <label>Name <input bind:value={lg.name} onchange={speichern} /></label>
      <label>Fach <input bind:value={lg.fach} onchange={speichern} /></label>
      <label>Schuljahr <input bind:value={lg.schuljahr} onchange={speichern} /></label>
      <label>2. Halbjahr beginnt am <input type="date" bind:value={lg.beginnHj2} onchange={speichern} /></label>
      <label>
        Anteil 1. Halbjahr an der Jahresnote (%)
        <input
          type="number"
          min="0"
          max="100"
          step="5"
          value={Math.round(lg.anteilHj1 * 100)}
          onchange={(e) => {
            lg.anteilHj1 = Math.min(100, Math.max(0, Number(e.currentTarget.value) || 0)) / 100;
            speichern();
          }}
        />
      </label>
    </div>
  </section>

  <section class="karte stapel">
    <h2>Notenbereiche</h2>
    <p class="leise">Die Gewichte sind relativ: 50/50 heißt halb und halb. Hat ein Schüler in einem Bereich keine Note, wird der Bereich für ihn herausgerechnet.</p>
    <table>
      <thead><tr><th>Name</th><th>Gewicht</th><th>Anteil</th><th>Quelle</th><th></th></tr></thead>
      <tbody>
        {#each lg.notenbereiche as b (b.id)}
          <tr>
            <td><input bind:value={b.name} onchange={speichern} /></td>
            <td><input class="zahlfeld" type="number" min="0" bind:value={b.gewicht} onchange={speichern} /></td>
            <td class="zahl">{prozent(b)} %</td>
            <td class="leise">{b.art === 'muendlich' ? 'Stundeneindrücke' : 'Leistungsnachweise'}</td>
            <td><button class="klein gefahr" onclick={() => bereichLoeschen(b)}>Entfernen</button></td>
          </tr>
        {/each}
      </tbody>
    </table>
    <div class="zeile">
      <button onclick={() => bereichNeu('nachweise')}>+ Bereich für Leistungsnachweise</button>
      {#if !hatMuendlich}<button onclick={() => bereichNeu('muendlich')}>+ Mündliche Note</button>{/if}
      <span class="leer"></span>
      <button onclick={alsVorlage} disabled={!lg.fach.trim()}>Als Fachvorlage „{lg.fach || '?'}“ speichern</button>
    </div>
  </section>

  <section class="karte stapel">
    <h2>Verhaltenskategorien</h2>
    <p class="leise">Erscheinen beim langen Druck auf einen Schüler. Am übersichtlichsten sind 4–6 Kategorien. Sie fließen nie in die Note ein.</p>
    <table>
      <thead><tr><th>Symbol</th><th>Name</th><th>positiv</th><th></th></tr></thead>
      <tbody>
        {#each lg.verhaltenskategorien as k (k.id)}
          <tr>
            <td><input class="symbol" bind:value={k.symbol} onchange={speichern} maxlength="4" /></td>
            <td><input bind:value={k.name} onchange={speichern} /></td>
            <td><input type="checkbox" bind:checked={k.positiv} onchange={speichern} /></td>
            <td><button class="klein gefahr" onclick={() => kategorieLoeschen(k.id)}>Entfernen</button></td>
          </tr>
        {/each}
      </tbody>
    </table>
    <div><button onclick={kategorieNeu}>+ Kategorie</button></div>
  </section>

  <section class="karte stapel">
    <h2>Archiv und Löschen</h2>
    <p class="leise">Am Schuljahresende archivieren: Die Lerngruppe bleibt lesbar, im Unterricht wird nichts mehr erfasst.</p>
    <div class="zeile">
      <button onclick={archivieren}>{lg.archiviert ? 'Wieder aktivieren' : 'Archivieren'}</button>
      <button class="gefahr" onclick={loeschen}>Lerngruppe löschen</button>
    </div>
  </section>
</div>

<style>
  .felder {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 0.8rem;
  }

  td input {
    min-height: 38px;
    width: 100%;
  }

  .zahlfeld {
    width: 90px !important;
  }

  .symbol {
    width: 64px !important;
    text-align: center;
    font-size: 1.2rem;
  }

  .leer {
    flex: 1;
  }
</style>

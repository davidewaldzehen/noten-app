<script lang="ts">
  import {
    ausgeschiedene,
    daten,
    mitglieder,
    schuelerAusscheiden,
    schuelerHinzufuegen,
    schuelerUebernehmen,
    schuelerWiederAufnehmen,
    speichereSchueler,
    zeigeSnackbar,
  } from '../daten/store.svelte';
  import { leseSchuelerliste, type ImportZeile } from '../domain/import';
  import { nachNameSortiert } from '../domain/sitzplan';
  import type { Id, Lerngruppe, Schueler } from '../domain/typen';
  import Kopf from './Kopf.svelte';

  let { lg }: { lg: Lerngruppe } = $props();

  const aktiv = $derived(nachNameSortiert(mitglieder(lg)));
  const weg = $derived(nachNameSortiert(ausgeschiedene(lg)));

  // Einfügen
  let text = $state('');
  let standardKlasse = $state('');
  let getauscht = $state(false);
  const vorschau = $derived(
    leseSchuelerliste(text, standardKlasse).map((z): ImportZeile => (getauscht ? { ...z, vorname: z.nachname, nachname: z.vorname } : z)),
  );

  function einfuegen() {
    const n = schuelerHinzufuegen(lg, vorschau);
    zeigeSnackbar(`${n} Schüler hinzugefügt.`);
    text = '';
    getauscht = false;
  }

  // Einzeln
  let vorname = $state('');
  let nachname = $state('');
  let klasse = $state('');

  function einzeln(e: SubmitEvent) {
    e.preventDefault();
    if (!vorname.trim() && !nachname.trim()) return;
    schuelerHinzufuegen(lg, [{ vorname, nachname, klasse }]);
    zeigeSnackbar(`${vorname} ${nachname} hinzugefügt.`);
    vorname = nachname = '';
  }

  // Übernehmen aus anderer Lerngruppe
  let quelleId = $state('');
  let auswahl = $state<Id[]>([]);
  const andere = $derived(daten.lerngruppen.filter((l) => l.id !== lg.id && !l.archiviert));
  const quelle = $derived(andere.find((l) => l.id === quelleId));
  const kandidaten = $derived(quelle ? nachNameSortiert(mitglieder(quelle)).filter((s) => !aktiv.some((a) => a.id === s.id)) : []);

  function quelleGewaehlt() {
    auswahl = kandidaten.map((s) => s.id);
  }

  function uebernehmen() {
    const n = schuelerUebernehmen(lg, auswahl);
    zeigeSnackbar(`${n} Schüler übernommen.`);
    quelleId = '';
    auswahl = [];
  }

  function ausscheiden(s: Schueler) {
    if (confirm(`${s.vorname} ${s.nachname} aus ${lg.name} entfernen? Bisherige Noten und Beobachtungen bleiben erhalten.`)) schuelerAusscheiden(lg, s.id);
  }
</script>

<Kopf titel={lg.name} {lg} aktiv="schueler" />

<div class="seite stapel">
  <section class="karte stapel">
    <h2>Schüler ({aktiv.length})</h2>
    {#if aktiv.length === 0}
      <p class="leise">Noch keine Schüler. Füge unten eine Liste ein.</p>
    {:else}
      <table>
        <thead><tr><th>Nachname</th><th>Vorname</th><th>Klasse</th><th></th></tr></thead>
        <tbody>
          {#each aktiv as s (s.id)}
            <tr>
              <td><input bind:value={s.nachname} onchange={() => speichereSchueler(s)} /></td>
              <td><input bind:value={s.vorname} onchange={() => speichereSchueler(s)} /></td>
              <td><input class="klasse" bind:value={s.klasse} onchange={() => speichereSchueler(s)} /></td>
              <td class="r">
                <a href={`#/lg/${lg.id}/bericht/${s.id}`}>Bericht</a>
                <button class="klein gefahr" onclick={() => ausscheiden(s)}>Entfernen</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
      {#if lg.sitzplan.plaetze.length > 0}
        <p class="leise">Plätze vergibst du im Reiter <a href={`#/lg/${lg.id}/sitzplan`}>Sitzplan</a>.</p>
      {/if}
    {/if}
  </section>

  <section class="karte stapel">
    <h2>Liste einfügen</h2>
    <p class="leise">
      Kopiere die Schülerliste z. B. aus WebUntis und füge sie hier ein – ein Schüler pro Zeile. Erkannt werden „Vorname Nachname“,
      „Nachname, Vorname“ und Tabellen mit Kopfzeile.
    </p>
    <textarea bind:value={text} placeholder={'Anna Müller\nLeon Schulz\n…'}></textarea>
    <div class="zeile">
      <label>Klasse (falls nicht in der Liste) <input class="klasse" bind:value={standardKlasse} placeholder="7a" /></label>
    </div>
    {#if vorschau.length > 0}
      <div class="zeile">
        <strong>Vorschau: {vorschau.length} Schüler</strong>
        <button class="klein" onclick={() => (getauscht = !getauscht)}>Vor- und Nachname tauschen</button>
      </div>
      <div class="vorschau">
        <table>
          <thead><tr><th>Vorname</th><th>Nachname</th><th>Klasse</th></tr></thead>
          <tbody>
            {#each vorschau as z}
              <tr><td>{z.vorname}</td><td>{z.nachname}</td><td>{z.klasse}</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div><button class="primaer" onclick={einfuegen}>{vorschau.length} Schüler hinzufügen</button></div>
    {/if}
  </section>

  {#if andere.length > 0}
    <section class="karte stapel">
      <h2>Aus anderer Lerngruppe übernehmen</h2>
      <p class="leise">Z. B. für dieselbe Klasse in einem anderen Fach oder für einen Kurs aus mehreren Klassen.</p>
      <select bind:value={quelleId} onchange={quelleGewaehlt}>
        <option value="">Lerngruppe wählen …</option>
        {#each andere as l (l.id)}<option value={l.id}>{l.name}</option>{/each}
      </select>
      {#if quelle}
        {#if kandidaten.length === 0}
          <p class="leise">Alle Schüler aus {quelle.name} sind schon in dieser Lerngruppe.</p>
        {:else}
          <div class="auswahl">
            {#each kandidaten as s (s.id)}
              <label class="check"><input type="checkbox" bind:group={auswahl} value={s.id} /> {s.nachname}, {s.vorname} <span class="leise">{s.klasse}</span></label>
            {/each}
          </div>
          <div><button class="primaer" onclick={uebernehmen} disabled={auswahl.length === 0}>{auswahl.length} übernehmen</button></div>
        {/if}
      {/if}
    </section>
  {/if}

  <section class="karte">
    <h2>Einzeln hinzufügen</h2>
    <form class="zeile unten" onsubmit={einzeln}>
      <label>Vorname <input bind:value={vorname} /></label>
      <label>Nachname <input bind:value={nachname} /></label>
      <label>Klasse <input class="klasse" bind:value={klasse} /></label>
      <button type="submit">Hinzufügen</button>
    </form>
  </section>

  {#if weg.length > 0}
    <section class="karte stapel">
      <h2>Ausgeschieden ({weg.length})</h2>
      <p class="leise">Ihre Noten bleiben erhalten und erscheinen in der Notenübersicht.</p>
      {#each weg as s (s.id)}
        <div class="zeile">
          <span>{s.nachname}, {s.vorname} <span class="leise">{s.klasse}</span></span>
          <button class="klein" onclick={() => schuelerWiederAufnehmen(lg, s.id)}>Wieder aufnehmen</button>
        </div>
      {/each}
    </section>
  {/if}
</div>

<style>
  td input {
    width: 100%;
    min-height: 38px;
  }

  .klasse {
    width: 80px;
  }

  .r {
    text-align: right;
    white-space: nowrap;
  }

  .r a {
    margin-right: 0.6rem;
  }

  .vorschau {
    max-height: 260px;
    overflow: auto;
    border: 1px solid var(--rand);
    border-radius: 8px;
  }

  .auswahl {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 0.3rem;
  }

  .check {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    color: var(--text);
    font-size: 1rem;
    min-height: 40px;
  }

  .unten {
    align-items: flex-end;
  }
</style>

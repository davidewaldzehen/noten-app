<script lang="ts">
  import { daten, mitglieder, nachweisLoeschen, speichereNachweis } from '../daten/store.svelte';
  import { formatNote, parseNote } from '../domain/noten';
  import { nachNameSortiert } from '../domain/sitzplan';
  import type { Id, Lerngruppe } from '../domain/typen';
  import Kopf from './Kopf.svelte';
  import { geheZu } from './router.svelte';

  let { lg, nachweisId }: { lg: Lerngruppe; nachweisId: Id } = $props();

  const nachweis = $derived(daten.nachweise.find((n) => n.id === nachweisId));
  const schueler = $derived(nachNameSortiert(mitglieder(lg)));
  const bereiche = $derived(lg.notenbereiche.filter((b) => b.art === 'nachweise'));

  const auswertung = $derived.by(() => {
    if (!nachweis) return { schnitt: undefined, anzahl: 0, spiegel: [] as number[] };
    const noten = schueler.map((s) => parseNote(nachweis.noten[s.id])).filter((x): x is number => typeof x === 'number');
    const spiegel = [1, 2, 3, 4, 5, 6].map((g) => noten.filter((n) => Math.round(n) === g).length);
    return { schnitt: noten.length ? noten.reduce((a, b) => a + b, 0) / noten.length : undefined, anzahl: noten.length, spiegel };
  });

  function speichern() {
    if (nachweis) speichereNachweis(nachweis);
  }

  function setzeNote(id: Id, text: string) {
    if (!nachweis) return;
    if (text.trim() === '') delete nachweis.noten[id];
    else nachweis.noten[id] = text.trim();
    speichern();
  }

  // Eingabetaste springt zum nächsten Schüler.
  function weiter(e: KeyboardEvent, i: number) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const naechstes = document.querySelector<HTMLInputElement>(`[data-note-index="${i + 1}"]`);
    if (naechstes) naechstes.focus();
    else (e.target as HTMLInputElement).blur();
  }

  function loeschen() {
    if (nachweis && confirm(`„${nachweis.titel}“ mit allen Noten löschen?`)) {
      nachweisLoeschen(nachweis.id);
      geheZu(`lg/${lg.id}/nachweise`);
    }
  }
</script>

<Kopf titel={nachweis?.titel ?? 'Leistungsnachweis'} zurueck={`#/lg/${lg.id}/nachweise`}>
  {#snippet aktionen()}
    <button class="gefahr" onclick={loeschen}>Löschen</button>
  {/snippet}
</Kopf>

{#if nachweis}
  <div class="seite raster">
    <div class="karte stapel kopfdaten">
      <label>Titel <input bind:value={nachweis.titel} onchange={speichern} /></label>
      <label>Datum <input type="date" bind:value={nachweis.datum} onchange={speichern} /></label>
      <label>
        Notenbereich
        <select bind:value={nachweis.notenbereichId} onchange={speichern}>
          {#each bereiche as b (b.id)}<option value={b.id}>{b.name}</option>{/each}
        </select>
      </label>
      <label>
        Gewicht im Notenbereich
        <input type="number" min="0" step="0.5" bind:value={nachweis.gewicht} onchange={speichern} />
      </label>
      <p class="leise">Gewicht 1 = normal, 0,5 = zählt halb.</p>
      <div class="auswertung">
        <div><span class="leise">Schnitt</span> <strong class="zahl">{formatNote(auswertung.schnitt)}</strong></div>
        <div><span class="leise">Eingetragen</span> <strong class="zahl">{auswertung.anzahl} / {schueler.length}</strong></div>
        <table class="spiegel">
          <tbody>
            <tr>{#each [1, 2, 3, 4, 5, 6] as g}<th>{g}</th>{/each}</tr>
            <tr>{#each auswertung.spiegel as n}<td class="zahl">{n}</td>{/each}</tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="karte">
      <p class="leise">Note eintippen, z. B. <code>2</code>, <code>2-</code>, <code>3+</code> oder <code>2,5</code>. Die Eingabetaste springt weiter.</p>
      <table>
        <tbody>
          {#each schueler as s, i (s.id)}
            {@const text = nachweis.noten[s.id] ?? ''}
            {@const wert = parseNote(text)}
            <tr>
              <td>{s.nachname}, {s.vorname}</td>
              <td class="eingabe">
                <input
                  data-note-index={i}
                  value={text}
                  class:ungueltig={wert === null}
                  autocomplete="off"
                  autocapitalize="off"
                  spellcheck="false"
                  enterkeyhint="next"
                  onchange={(e) => setzeNote(s.id, e.currentTarget.value)}
                  onkeydown={(e) => weiter(e, i)}
                />
              </td>
              <td class="zahl leise">{wert === null ? 'ungültig' : wert === undefined ? '' : formatNote(wert)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{:else}
  <p class="seite">Dieser Leistungsnachweis existiert nicht mehr.</p>
{/if}

<style>
  .raster {
    display: grid;
    grid-template-columns: minmax(240px, 320px) 1fr;
    gap: 1rem;
    align-items: start;
  }

  @media (max-width: 700px) {
    .raster {
      grid-template-columns: 1fr;
    }
  }

  .kopfdaten {
    position: sticky;
    top: 70px;
  }

  .auswertung {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .spiegel th,
  .spiegel td {
    text-align: center;
    padding: 0.2em;
  }

  .eingabe input {
    width: 90px;
    text-align: center;
    font-size: 1.1rem;
  }

  .ungueltig {
    border-color: var(--gefahr);
    color: var(--gefahr);
  }
</style>

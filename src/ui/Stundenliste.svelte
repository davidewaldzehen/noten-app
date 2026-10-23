<script lang="ts">
  import { beobachtungenVon, stundeLoeschen, stundenVon } from '../daten/store.svelte';
  import { kurzdatum, zeitraumVon } from '../domain/datum';
  import { STUFEN, type Lerngruppe, type Stunde } from '../domain/typen';
  import { STUFEN_ANZEIGE } from '../domain/vorschlag';
  import Kopf from './Kopf.svelte';
  import { stufenKlasse } from './stufen';

  let { lg }: { lg: Lerngruppe } = $props();

  const stunden = $derived(stundenVon(lg.id).slice().reverse());

  function verteilung(s: Stunde) {
    const werte = Object.values(s.eindruecke);
    return {
      stufen: STUFEN.map((st) => ({ st, n: werte.filter((e) => e.art === 'stufe' && e.stufe === st).length })),
      abwesend: werte.filter((e) => e.art === 'abwesend').length,
    };
  }

  function loeschen(s: Stunde) {
    if (confirm(`Stunde vom ${kurzdatum(s.datum)} mit allen Beobachtungen und Eindrücken löschen?`)) stundeLoeschen(s.id);
  }
</script>

<Kopf titel={lg.name} {lg} aktiv="stunden" />

<div class="seite stapel">
  {#if stunden.length === 0}
    <p class="leise">Noch keine Stunden. Im Reiter „Unterricht“ beginnt eine Stunde mit dem ersten Tipp auf einen Schüler.</p>
  {:else}
    <div class="karte">
      <table>
        <thead>
          <tr>
            <th>Datum</th>
            <th>Halbjahr</th>
            <th>Länge</th>
            <th>Eindrücke</th>
            <th>Beobachtungen</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each stunden as s (s.id)}
            {@const v = verteilung(s)}
            <tr>
              <td>{kurzdatum(s.datum)}</td>
              <td>{zeitraumVon(s.datum, lg.beginnHj2) === 'hj1' ? '1.' : '2.'}</td>
              <td>{s.gewicht === 2 ? 'Doppelstunde' : 'Einzelstunde'}</td>
              <td>
                {#if s.abgeschlossen}
                  <span class="verteilung">
                    {#each v.stufen as { st, n }}
                      {#if n > 0}<span class={`marke ${stufenKlasse(st)}`}>{STUFEN_ANZEIGE[st]} {n}</span>{/if}
                    {/each}
                    {#if v.abwesend > 0}<span class="leise">abw. {v.abwesend}</span>{/if}
                  </span>
                {:else}
                  <span class="offen">offen</span>
                {/if}
              </td>
              <td class="zahl">{beobachtungenVon(s.id).length}</td>
              <td class="aktionen">
                {#if s.abgeschlossen}
                  <a href={`#/lg/${lg.id}/abschluss/${s.id}`}>Bearbeiten</a>
                {:else}
                  <a href={`#/lg/${lg.id}/abschluss`}>Abschließen</a>
                {/if}
                <button class="klein gefahr" onclick={() => loeschen(s)}>Löschen</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .verteilung {
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
    align-items: center;
  }

  .marke {
    color: var(--s);
    background: var(--s-hell);
    border-radius: 5px;
    padding: 0 0.4em;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .offen {
    color: var(--warnung);
    font-weight: 600;
  }

  .aktionen {
    display: flex;
    gap: 0.8rem;
    align-items: center;
    justify-content: flex-end;
  }
</style>

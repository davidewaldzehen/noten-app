<script lang="ts">
  import { mitglieder, nachweisAnlegen, nachweiseVon } from '../daten/store.svelte';
  import { kurzdatum, zeitraumVon } from '../domain/datum';
  import { formatNote, parseNote } from '../domain/noten';
  import type { Leistungsnachweis, Lerngruppe } from '../domain/typen';
  import Kopf from './Kopf.svelte';
  import { geheZu } from './router.svelte';

  let { lg }: { lg: Lerngruppe } = $props();

  const bereiche = $derived(lg.notenbereiche.filter((b) => b.art === 'nachweise'));
  const nachweise = $derived(nachweiseVon(lg.id));

  function auswertung(n: Leistungsnachweis) {
    const noten = mitglieder(lg)
      .map((s) => parseNote(n.noten[s.id]))
      .filter((x): x is number => typeof x === 'number');
    return {
      anzahl: noten.length,
      schnitt: noten.length ? noten.reduce((a, b) => a + b, 0) / noten.length : undefined,
    };
  }

  function neu(bereichId: string) {
    const n = nachweisAnlegen(lg, bereichId);
    geheZu(`lg/${lg.id}/nachweis/${n.id}`);
  }
</script>

<Kopf titel={lg.name} {lg} aktiv="nachweise" />

<div class="seite stapel">
  {#if bereiche.length === 0}
    <p class="leise">
      Diese Lerngruppe hat keinen Notenbereich für Leistungsnachweise. Lege einen in den <a href={`#/lg/${lg.id}/einstellungen`}>Einstellungen</a> an.
    </p>
  {/if}
  {#each bereiche as b (b.id)}
    {@const liste = nachweise.filter((n) => n.notenbereichId === b.id)}
    <section class="karte stapel">
      <div class="zeile">
        <h2>{b.name}</h2>
        <span class="leer"></span>
        <button class="primaer" onclick={() => neu(b.id)} disabled={lg.archiviert}>+ Neu</button>
      </div>
      {#if liste.length === 0}
        <p class="leise">Noch keine Einträge.</p>
      {:else}
        <table>
          <thead>
            <tr><th>Titel</th><th>Datum</th><th>Halbjahr</th><th>Gewicht</th><th>Noten</th><th>Schnitt</th></tr>
          </thead>
          <tbody>
            {#each liste as n (n.id)}
              {@const a = auswertung(n)}
              <tr>
                <td><a href={`#/lg/${lg.id}/nachweis/${n.id}`}>{n.titel}</a></td>
                <td>{kurzdatum(n.datum)}</td>
                <td>{zeitraumVon(n.datum, lg.beginnHj2) === 'hj1' ? '1.' : '2.'}</td>
                <td class="zahl">{String(n.gewicht).replace('.', ',')}</td>
                <td class="zahl">{a.anzahl} / {mitglieder(lg).length}</td>
                <td class="zahl">{formatNote(a.schnitt)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </section>
  {/each}
</div>

<style>
  h2 {
    margin: 0;
  }

  .leer {
    flex: 1;
  }
</style>

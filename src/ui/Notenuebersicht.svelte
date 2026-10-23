<script lang="ts">
  import { untrack } from 'svelte';
  import { alsCsv, speichereDatei } from '../daten/export';
  import { ausgeschiedene, daten, mitglieder, nachweiseVon, stundenVon, zeigeSnackbar, zeugnisnoteSetzen } from '../daten/store.svelte';
  import { heute, langdatum } from '../domain/datum';
  import { berechneNoten, formatNote, istGrenzfall, rundungsvorschlag, type Notenergebnis } from '../domain/noten';
  import { nachNameSortiert } from '../domain/sitzplan';
  import type { Id, Lerngruppe, Schueler } from '../domain/typen';
  import Kopf from './Kopf.svelte';

  let { lg }: { lg: Lerngruppe } = $props();

  type Ansicht = 'hj1' | 'hj2' | 'jahr';
  let ansicht = $state<Ansicht>(untrack(() => (heute() < lg.beginnHj2 ? 'hj1' : 'jahr')));

  const ANSICHTEN: { id: Ansicht; name: string }[] = [
    { id: 'hj1', name: '1. Halbjahr (Halbjahreszeugnis)' },
    { id: 'hj2', name: '2. Halbjahr (nur Info)' },
    { id: 'jahr', name: 'Schuljahr (Jahreszeugnis)' },
  ];

  interface Zeile {
    s: Schueler;
    ausgeschieden: boolean;
    e: Notenergebnis;
    note: number | undefined;
  }

  const zeilen = $derived.by((): Zeile[] => {
    const stunden = stundenVon(lg.id);
    const nachweise = nachweiseVon(lg.id);
    const liste = [
      ...nachNameSortiert(mitglieder(lg)).map((s) => ({ s, ausgeschieden: false })),
      ...nachNameSortiert(ausgeschiedene(lg)).map((s) => ({ s, ausgeschieden: true })),
    ];
    return liste.map(({ s, ausgeschieden }) => {
      const e = berechneNoten(lg, stunden, nachweise, daten.einstellungen.stufenNoten, s.id);
      return { s, ausgeschieden, e, note: ansicht === 'jahr' ? e.jahr : e[ansicht].fachnote };
    });
  });

  const zeugnis = $derived<'hj1' | 'jahr' | null>(ansicht === 'hj2' ? null : ansicht);
  const titel = $derived(ANSICHTEN.find((a) => a.id === ansicht)!.name);

  function zeugnisnote(id: Id) {
    return zeugnis ? lg.zeugnisnoten[zeugnis][id] : undefined;
  }

  function setze(id: Id, wert: string) {
    if (!zeugnis) return;
    zeugnisnoteSetzen(lg, zeugnis, id, wert ? Number(wert) : undefined, zeugnisnote(id)?.begruendung);
  }

  function begruende(id: Id, text: string) {
    const z = zeugnisnote(id);
    if (zeugnis && z) zeugnisnoteSetzen(lg, zeugnis, id, z.note, text);
  }

  function alleUebernehmen() {
    if (!zeugnis) return;
    let n = 0;
    for (const z of zeilen) {
      if (z.ausgeschieden || z.note === undefined || zeugnisnote(z.s.id)) continue;
      zeugnisnoteSetzen(lg, zeugnis, z.s.id, rundungsvorschlag(z.note));
      n++;
    }
    zeigeSnackbar(n ? `${n} Vorschläge übernommen.` : 'Alle Zeugnisnoten sind schon gesetzt.');
  }

  function csv() {
    const bereiche = lg.notenbereiche;
    const kopf = ['Nachname', 'Vorname', 'Klasse'];
    if (ansicht === 'jahr') kopf.push('Fachnote 1. HJ', 'Fachnote 2. HJ', 'Jahresnote');
    else kopf.push(...bereiche.map((b) => b.name), 'Fachnote');
    if (zeugnis) kopf.push('Vorschlag', 'Zeugnisnote', 'Begründung');
    const runde = (x: number | undefined) => (x === undefined ? undefined : Math.round(x * 100) / 100);
    const daten_ = zeilen.map((z) => {
      const zeile: (string | number | undefined)[] = [z.s.nachname, z.s.vorname, z.s.klasse + (z.ausgeschieden ? ' (ausgeschieden)' : '')];
      if (ansicht === 'jahr') zeile.push(runde(z.e.hj1.fachnote), runde(z.e.hj2.fachnote), runde(z.e.jahr));
      else zeile.push(...bereiche.map((b) => runde(z.e[ansicht as 'hj1' | 'hj2'].bereiche[b.id])), runde(z.note));
      if (zeugnis) {
        const zn = zeugnisnote(z.s.id);
        zeile.push(z.note === undefined ? undefined : rundungsvorschlag(z.note), zn?.note, zn?.begruendung);
      }
      return zeile;
    });
    speichereDatei(alsCsv([kopf, ...daten_]), `Noten ${lg.name} ${titel}.csv`.replace(/[\\/:*?"<>|]/g, '-'), 'text/csv;charset=utf-8');
  }
</script>

<Kopf titel={lg.name} {lg} aktiv="noten">
  {#snippet aktionen()}
    <button onclick={csv}>CSV</button>
    <button onclick={() => window.print()}>Drucken / PDF</button>
  {/snippet}
</Kopf>

<div class="seite stapel">
  <div class="nur-druck">
    <h1>Notenübersicht {lg.name}</h1>
    <p>{titel} · Schuljahr {lg.schuljahr} · Stand {langdatum(heute())}</p>
  </div>

  <div class="zeile nicht-drucken">
    <select bind:value={ansicht}>
      {#each ANSICHTEN as a}<option value={a.id}>{a.name}</option>{/each}
    </select>
    {#if zeugnis}
      <button onclick={alleUebernehmen} disabled={lg.archiviert}>Alle Vorschläge übernehmen</button>
    {/if}
    <span class="leise">
      {#if ansicht === 'jahr'}
        Jahresnote = {Math.round(lg.anteilHj1 * 100)} % 1. Halbjahr + {100 - Math.round(lg.anteilHj1 * 100)} % 2. Halbjahr.
      {:else}
        Gewichte: {lg.notenbereiche.map((b) => `${b.name} ${b.gewicht}`).join(' · ')}
      {/if}
    </span>
  </div>

  <div class="karte tabelle">
    <table>
      <thead>
        <tr>
          <th>Name</th>
          {#if ansicht === 'jahr'}
            <th class="r">1. HJ</th>
            <th class="r">2. HJ</th>
            <th class="r">Jahr</th>
          {:else}
            {#each lg.notenbereiche as b (b.id)}<th class="r">{b.name}</th>{/each}
            <th class="r">Fachnote</th>
          {/if}
          {#if zeugnis}
            <th class="r">Vorschlag</th>
            <th>Zeugnisnote</th>
            <th>Begründung bei Abweichung</th>
          {/if}
        </tr>
      </thead>
      <tbody>
        {#each zeilen as z (z.s.id)}
          {@const zn = zeugnisnote(z.s.id)}
          {@const vorschlag = z.note === undefined ? undefined : rundungsvorschlag(z.note)}
          {@const grenzfall = z.note !== undefined && istGrenzfall(z.note, daten.einstellungen.grenzfallBreite)}
          <tr class:ausgeschieden={z.ausgeschieden} class:grenzfall>
            <td>
              <a href={`#/lg/${lg.id}/bericht/${z.s.id}`}>{z.s.nachname}, {z.s.vorname}</a>
              {#if z.ausgeschieden}<span class="leise"> (ausgeschieden)</span>{/if}
            </td>
            {#if ansicht === 'jahr'}
              <td class="r zahl">{formatNote(z.e.hj1.fachnote)}</td>
              <td class="r zahl">{formatNote(z.e.hj2.fachnote)}</td>
              <td class="r zahl"><strong>{formatNote(z.e.jahr)}</strong></td>
            {:else}
              {#each lg.notenbereiche as b (b.id)}
                <td class="r zahl">{formatNote(z.e[ansicht].bereiche[b.id])}</td>
              {/each}
              <td class="r zahl"><strong>{formatNote(z.note)}</strong></td>
            {/if}
            {#if zeugnis}
              <td class="r zahl">{vorschlag ?? '–'}{#if grenzfall}<span class="grenz" title="Grenzfall"> ⚠︎</span>{/if}</td>
              <td>
                <select value={zn?.note ?? ''} onchange={(e) => setze(z.s.id, e.currentTarget.value)} disabled={lg.archiviert} class:abweichend={zn && vorschlag !== undefined && zn.note !== vorschlag}>
                  <option value="">–</option>
                  {#each [1, 2, 3, 4, 5, 6] as n}<option value={n}>{n}</option>{/each}
                </select>
              </td>
              <td>
                {#if zn && (zn.note !== vorschlag || zn.begruendung)}
                  <input
                    class="begruendung"
                    value={zn.begruendung ?? ''}
                    placeholder="z. B. deutliche Steigerung im 2. HJ"
                    onchange={(e) => begruende(z.s.id, e.currentTarget.value)}
                    disabled={lg.archiviert}
                  />
                {/if}
              </td>
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  {#if zeugnis}
    <p class="leise nicht-drucken">
      ⚠︎ = Grenzfall (Fachnote liegt höchstens {String(daten.einstellungen.grenzfallBreite).replace('.', ',')} von x,5 entfernt). x,5 wird zur schlechteren Note gerundet. Die Zeugnisnote
      entscheidest du.
    </p>
  {/if}
</div>

<style>
  .tabelle {
    overflow-x: auto;
    padding: 0.4rem;
  }

  .r {
    text-align: right;
  }

  .ausgeschieden {
    color: var(--text-2);
  }

  .grenzfall td {
    background: var(--warnung-hell);
  }

  .grenz {
    color: var(--warnung);
  }

  .abweichend {
    border-color: var(--warnung);
    border-width: 2px;
  }

  .begruendung {
    width: 100%;
    min-width: 200px;
  }

  @media print {
    select {
      border: none;
      appearance: none;
      padding: 0;
      min-height: 0;
    }
    input {
      border: none;
      padding: 0;
      min-height: 0;
    }
  }
</style>

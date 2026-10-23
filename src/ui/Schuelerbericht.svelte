<script lang="ts">
  import { daten, nachweiseVon, notizAendern, notizHinzufuegen, notizLoeschen, schuelerMitId, stundenVon } from '../daten/store.svelte';
  import { heute, kurzdatum, langdatum, zeitraumVon } from '../domain/datum';
  import { notizenZu } from '../domain/notizen';
  import { berechneNoten, eindrucksverteilung, formatNote, formatNotentext, parseNote } from '../domain/noten';
  import { STUFEN, type Bewertungszeitraum, type Id, type Lerngruppe, type Verhaltensbeobachtung } from '../domain/typen';
  import { STUFEN_ANZEIGE } from '../domain/vorschlag';
  import Kopf from './Kopf.svelte';
  import { eindruckText, stufenKlasse } from './stufen';

  let { lg, schuelerId }: { lg: Lerngruppe; schuelerId: Id } = $props();

  const s = $derived(schuelerMitId(schuelerId));
  const stunden = $derived(stundenVon(lg.id).filter((st) => st.abgeschlossen && st.eindruecke[schuelerId]));
  const nachweise = $derived(nachweiseVon(lg.id));
  const e = $derived(berechneNoten(lg, stundenVon(lg.id), nachweise, daten.einstellungen.stufenNoten, schuelerId));
  const verhalten = $derived(
    daten.beobachtungen
      .filter((b): b is Verhaltensbeobachtung => b.lerngruppeId === lg.id && b.schuelerId === schuelerId && b.art === 'verhalten')
      .sort((a, b) => a.zeit - b.zeit),
  );

  function stundenIm(z: Bewertungszeitraum) {
    return stunden.filter((st) => zeitraumVon(st.datum, lg.beginnHj2) === z);
  }

  const notizen = $derived(notizenZu(lg.notizen, schuelerId));
  let neueNotiz = $state('');
  let notizDatum = $state(heute());

  function notizSpeichern() {
    if (!neueNotiz.trim()) return;
    notizHinzufuegen(lg, schuelerId, notizDatum || heute(), neueNotiz);
    neueNotiz = '';
  }

  function datumVonZeit(zeit: number) {
    const d = new Date(zeit);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
  }
</script>

<Kopf titel={s ? `${s.vorname} ${s.nachname}` : 'Schüler'} zurueck={`#/lg/${lg.id}/noten`}>
  {#snippet aktionen()}
    <button onclick={() => window.print()}>Drucken / PDF</button>
  {/snippet}
</Kopf>

{#if s}
  <div class="seite stapel">
    <div>
      <h1>{s.vorname} {s.nachname} <span class="leise">({s.klasse})</span></h1>
      <p class="leise">{lg.name} · {lg.fach} · Schuljahr {lg.schuljahr} · Stand {langdatum(heute())}</p>
    </div>

    <section class="karte">
      <h2>Noten</h2>
      <table>
        <thead>
          <tr>
            <th></th>
            {#each lg.notenbereiche as b (b.id)}<th class="r">{b.name} ({b.gewicht})</th>{/each}
            <th class="r">Fachnote</th>
            <th class="r">Zeugnisnote</th>
          </tr>
        </thead>
        <tbody>
          {#each [['hj1', '1. Halbjahr'], ['hj2', '2. Halbjahr']] as [z, name]}
            {@const ze = e[z as Bewertungszeitraum]}
            <tr>
              <td>{name}</td>
              {#each lg.notenbereiche as b (b.id)}<td class="r zahl">{formatNote(ze.bereiche[b.id])}</td>{/each}
              <td class="r zahl"><strong>{formatNote(ze.fachnote)}</strong></td>
              <td class="r zahl">{z === 'hj1' ? (lg.zeugnisnoten.hj1[schuelerId]?.note ?? '–') : ''}</td>
            </tr>
          {/each}
          <tr>
            <td>Schuljahr</td>
            <td colspan={lg.notenbereiche.length} class="leise">{Math.round(lg.anteilHj1 * 100)} % 1. HJ + {100 - Math.round(lg.anteilHj1 * 100)} % 2. HJ</td>
            <td class="r zahl"><strong>{formatNote(e.jahr)}</strong></td>
            <td class="r zahl">{lg.zeugnisnoten.jahr[schuelerId]?.note ?? '–'}</td>
          </tr>
        </tbody>
      </table>
      {#each [['hj1', 'Halbjahreszeugnis'], ['jahr', 'Jahreszeugnis']] as [z, name]}
        {@const b = lg.zeugnisnoten[z as 'hj1' | 'jahr'][schuelerId]?.begruendung}
        {#if b}<p><strong>Begründung {name}:</strong> {b}</p>{/if}
      {/each}
    </section>

    <section class="karte">
      <h2>Mündliche Mitarbeit</h2>
      {#if stunden.length === 0}
        <p class="leise">Noch keine Stunden.</p>
      {/if}
      {#each ['hj1', 'hj2'] as const as z}
        {@const liste = stundenIm(z)}
        {#if liste.length > 0}
          {@const v = eindrucksverteilung(liste, schuelerId)}
          <h3>{z === 'hj1' ? '1. Halbjahr' : '2. Halbjahr'} <span class="leise">({v.gewertet} gewertete Stunden)</span></h3>
          <p class="zeile">
            {#each STUFEN as st}
              <span class={`marke ${stufenKlasse(st)}`}>{STUFEN_ANZEIGE[st]} × {v.stufen[st]}</span>
            {/each}
            <span class="leise">abwesend × {v.abwesend}</span>
          </p>
          <div class="verlauf">
            {#each liste as st (st.id)}
              {@const ein = st.eindruecke[schuelerId]}
              <span class={`tag ${ein.art === 'stufe' ? stufenKlasse(ein.stufe) : 'nicht-da'}`} title={kurzdatum(st.datum)}>
                <small>{kurzdatum(st.datum).slice(4)}</small>
                <strong>{eindruckText(ein)}</strong>
              </span>
            {/each}
          </div>
        {/if}
      {/each}
    </section>

    <section class="karte">
      <h2>Leistungsnachweise</h2>
      {#if nachweise.length === 0}
        <p class="leise">Keine.</p>
      {:else}
        <table>
          <tbody>
            {#each nachweise as n (n.id)}
              {@const text = n.noten[schuelerId]}
              <tr>
                <td>{n.titel}</td>
                <td class="leise">{langdatum(n.datum)}</td>
                <td class="leise">{lg.notenbereiche.find((b) => b.id === n.notenbereichId)?.name}</td>
                <td class="r zahl"><strong>{text ? formatNotentext(text) : '–'}</strong></td>
                <td class="r zahl leise">{typeof parseNote(text) === 'number' ? formatNote(parseNote(text)!) : ''}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </section>

    <section class="karte">
      <h2>Arbeits- und Sozialverhalten <span class="leise">(fließt nicht in die Note ein)</span></h2>
      {#if verhalten.length === 0}
        <p class="leise">Keine Beobachtungen.</p>
      {:else}
        <table>
          <tbody>
            {#each lg.verhaltenskategorien as k (k.id)}
              {@const liste = verhalten.filter((b) => b.kategorieId === k.id)}
              {#if liste.length > 0}
                <tr>
                  <td>{k.symbol} {k.name}</td>
                  <td class="r zahl"><strong>{liste.length}×</strong></td>
                  <td class="leise">{liste.map((b) => datumVonZeit(b.zeit)).join(', ')}</td>
                </tr>
              {/if}
            {/each}
          </tbody>
        </table>
      {/if}
    </section>

    <section class="karte stapel">
      <h2>Notizen <span class="leise">(fließen nicht in die Note ein)</span></h2>
      {#if notizen.length === 0}
        <p class="leise">Keine Notizen.</p>
      {/if}
      {#each notizen as n (n.id)}
        <div class="notiz">
          <span class="leise zahl">{langdatum(n.datum)}</span>
          <p class:nur-druck={!lg.archiviert}>{n.text}</p>
          {#if !lg.archiviert}
            <textarea class="notiztext nicht-drucken" aria-label={`Notiz vom ${langdatum(n.datum)}`} value={n.text} onchange={(ev) => notizAendern(lg, n.id, ev.currentTarget.value)}></textarea>
            <button class="klein nicht-drucken" onclick={() => notizLoeschen(lg, n.id)}>Löschen</button>
          {/if}
        </div>
      {/each}
      {#if !lg.archiviert}
        <div class="zeile unten nicht-drucken">
          <label>Datum <input type="date" bind:value={notizDatum} /></label>
          <label class="breit">Neue Notiz <textarea rows="2" bind:value={neueNotiz} placeholder="z. B. Elterngespräch mit der Mutter, Absprache: Hausaufgaben täglich abzeichnen"></textarea></label>
          <button onclick={notizSpeichern} disabled={!neueNotiz.trim()}>Notiz hinzufügen</button>
        </div>
      {/if}
    </section>
  </div>
{:else}
  <p class="seite">Schüler nicht gefunden.</p>
{/if}

<style>
  h1 {
    margin-bottom: 0.2rem;
  }

  section h2 .leise,
  section h3 .leise {
    font-weight: 400;
  }

  .r {
    text-align: right;
  }

  .marke {
    color: var(--s);
    background: var(--s-hell);
    border-radius: 5px;
    padding: 0.1em 0.5em;
    font-weight: 600;
  }

  .verlauf {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .tag {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 46px;
    padding: 0.15rem 0.3rem;
    border-radius: 6px;
    background: var(--s-hell, var(--flaeche-2));
    color: var(--s, var(--text-2));
    line-height: 1.15;
  }

  .tag small {
    color: var(--text-2);
    font-size: 0.7rem;
  }

  .notiz {
    display: grid;
    grid-template-columns: 9rem 1fr auto;
    gap: 0.5rem;
    align-items: start;
  }

  .notiz p {
    margin: 0;
    white-space: pre-wrap;
  }

  .notiztext {
    min-height: 2.6rem;
    width: 100%;
    field-sizing: content;
  }

  .breit {
    flex: 1;
  }

  .breit textarea {
    width: 100%;
    min-height: 4.5rem;
  }

  @media print {
    .tag,
    .marke {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
</style>

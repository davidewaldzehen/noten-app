<script lang="ts">
  import { onMount } from 'svelte';
  import {
    beobachten,
    beobachtungenVon,
    beobachtungLoeschen,
    lerngruppeBenutzt,
    mitglieder,
    offeneStunde,
    stundeLoeschen,
    zeigeSnackbar,
    type Beobachtungsinhalt,
  } from '../daten/store.svelte';
  import { heute, kurzdatum } from '../domain/datum';
  import { anzeigenamen } from '../domain/sitzplan';
  import type { Beobachtung, Id, LeistungsStufe, Lerngruppe } from '../domain/typen';
  import { punkte } from '../domain/vorschlag';
  import { druck } from './druck';
  import Kopf from './Kopf.svelte';
  import Overlay from './Overlay.svelte';
  import { geheZu } from './router.svelte';
  import SitzplanRaster from './SitzplanRaster.svelte';

  let { lg }: { lg: Lerngruppe } = $props();

  onMount(() => lerngruppeBenutzt(lg));

  const offen = $derived(offeneStunde(lg.id));
  const alteOffene = $derived(offen && offen.datum < heute() ? offen : undefined);
  const beobachtungen = $derived(offen ? beobachtungenVon(offen.id) : []);
  const schueler = $derived(mitglieder(lg));
  const namen = $derived(anzeigenamen(schueler));
  const ohnePlatz = $derived(schueler.filter((s) => !lg.sitzplan.plaetze.some((p) => p.schuelerId === s.id)));

  let menueFuer = $state<Id | null>(null);

  const LEISTUNG: { stufe: LeistungsStufe; text: string }[] = [
    { stufe: '++', text: 'herausragend' },
    { stufe: '+', text: 'guter Beitrag' },
    { stufe: '-', text: 'konnte nicht antworten' },
  ];

  function vonSchueler(id: Id): Beobachtung[] {
    return beobachtungen.filter((b) => b.schuelerId === id);
  }

  function leistungen(id: Id): LeistungsStufe[] {
    return vonSchueler(id).flatMap((b) => (b.art === 'leistung' ? [b.stufe] : []));
  }

  function symbol(b: Beobachtung): string {
    if (b.art === 'leistung') return b.stufe === '-' ? '−' : b.stufe;
    return lg.verhaltenskategorien.find((k) => k.id === b.kategorieId)?.symbol ?? '•';
  }

  function festhalten(schuelerId: Id, inhalt: Beobachtungsinhalt) {
    if (lg.archiviert) return;
    const id = beobachten(lg.id, schuelerId, inhalt);
    const was =
      inhalt.art === 'leistung'
        ? symbol({ art: 'leistung', stufe: inhalt.stufe } as Beobachtung)
        : (lg.verhaltenskategorien.find((k) => k.id === inhalt.kategorieId)?.name ?? '');
    zeigeSnackbar(`${was} für ${namen.get(schuelerId)}`, () => beobachtungLoeschen(id));
  }

  function waehle(schuelerId: Id, inhalt: Beobachtungsinhalt) {
    festhalten(schuelerId, inhalt);
    menueFuer = null;
  }

  function verwerfen() {
    if (alteOffene && confirm(`Stunde vom ${kurzdatum(alteOffene.datum)} mit allen Beobachtungen löschen?`)) stundeLoeschen(alteOffene.id);
  }
</script>

<div class="ansicht">
  <Kopf titel={lg.name} {lg} aktiv="">
    {#snippet aktionen()}
      <span class="leise status">
        {#if offen}
          {beobachtungen.length} Beobachtung{beobachtungen.length === 1 ? '' : 'en'}
        {:else}
          Tippen beginnt die Stunde
        {/if}
      </span>
      <button class="primaer" onclick={() => geheZu(`lg/${lg.id}/abschluss`)} disabled={lg.archiviert}>Stunde abschließen</button>
    {/snippet}
  </Kopf>

  {#if lg.archiviert}
    <p class="hinweis archiv">Diese Lerngruppe ist archiviert. Im Unterricht kann nichts mehr erfasst werden.</p>
  {/if}

  {#if schueler.length === 0}
    <div class="seite">
      <div class="karte stapel">
        <p>Diese Lerngruppe hat noch keine Schüler.</p>
        <div><a href={`#/lg/${lg.id}/schueler`}>Schüler hinzufügen</a></div>
      </div>
    </div>
  {:else}
    <main class="plan">
      <SitzplanRaster plan={lg.sitzplan}>
        {#snippet platz(p)}
          {#if p.schuelerId && namen.has(p.schuelerId)}
            {@const id = p.schuelerId}
            {@const pkt = punkte(leistungen(id))}
            <button
              class="sitz"
              class:positiv={pkt > 0}
              class:negativ={pkt < 0}
              use:druck={{ kurz: () => festhalten(id, { art: 'leistung', stufe: '+' }), lang: () => (menueFuer = id) }}
            >
              <span class="name">{namen.get(id)}</span>
              <span class="marken">
                {#each vonSchueler(id) as b (b.id)}
                  <span class:verhalten={b.art === 'verhalten'} class:minus={b.art === 'leistung' && b.stufe === '-'}>{symbol(b)}</span>
                {/each}
              </span>
            </button>
          {:else}
            <div class="frei"></div>
          {/if}
        {/snippet}
      </SitzplanRaster>
    </main>

    {#if ohnePlatz.length > 0}
      <div class="ohne-platz">
        <span class="leise">Ohne Platz:</span>
        {#each ohnePlatz as s (s.id)}
          <button
            class="chip"
            use:druck={{ kurz: () => festhalten(s.id, { art: 'leistung', stufe: '+' }), lang: () => (menueFuer = s.id) }}
          >
            {namen.get(s.id)}
            {#each vonSchueler(s.id) as b (b.id)}<span>{symbol(b)}</span>{/each}
          </button>
        {/each}
      </div>
    {/if}
  {/if}
</div>

{#if menueFuer}
  {@const id = menueFuer}
  <Overlay schliessen={() => (menueFuer = null)}>
    <h2>{namen.get(id)}</h2>
    <div class="stapel klein">
      <span class="leise">Leistung</span>
      <div class="knoepfe">
        {#each LEISTUNG as l}
          <button class="leistung" class:minus={l.stufe === '-'} onclick={() => waehle(id, { art: 'leistung', stufe: l.stufe })}>
            <strong>{l.stufe === '-' ? '−' : l.stufe}</strong>
            <span>{l.text}</span>
          </button>
        {/each}
      </div>
    </div>
    <div class="stapel klein">
      <span class="leise">Verhalten (zählt nicht zur Note)</span>
      <div class="knoepfe">
        {#each lg.verhaltenskategorien as k (k.id)}
          <button class="verhalten" class:pos={k.positiv} onclick={() => waehle(id, { art: 'verhalten', kategorieId: k.id })}>
            <strong>{k.symbol}</strong>
            <span>{k.name}</span>
          </button>
        {/each}
      </div>
    </div>
    {#if vonSchueler(id).length > 0}
      <div class="stapel klein">
        <span class="leise">In dieser Stunde</span>
        <div class="zeile">
          {#each vonSchueler(id) as b (b.id)}
            <button class="klein" onclick={() => beobachtungLoeschen(b.id)} title="Löschen">{symbol(b)} ×</button>
          {/each}
        </div>
      </div>
    {/if}
    <button onclick={() => (menueFuer = null)}>Schließen</button>
  </Overlay>
{/if}

{#if alteOffene}
  <Overlay>
    <h2>Stunde vom {kurzdatum(alteOffene.datum)} ist noch offen</h2>
    <p>Bevor eine neue Stunde beginnt, schließ bitte die alte ab.</p>
    <div class="zeile">
      <button class="primaer" onclick={() => geheZu(`lg/${lg.id}/abschluss`)}>Jetzt abschließen</button>
      <button class="gefahr" onclick={verwerfen}>Stunde verwerfen</button>
      <a href="#/">Zurück</a>
    </div>
  </Overlay>
{/if}

<style>
  .ansicht {
    height: 100dvh;
    display: flex;
    flex-direction: column;
  }

  .status {
    white-space: nowrap;
  }

  .archiv {
    margin: 0.6rem 1rem 0;
  }

  .plan {
    flex: 1;
    min-height: 0;
    padding: 0.6rem 0.8rem 0.8rem;
  }

  .sitz {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.15rem;
    padding: 0.25rem;
    min-height: 0;
    border-radius: 12px;
    border: 1px solid var(--rand);
    background: var(--flaeche);
    box-shadow: var(--schatten);
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    touch-action: manipulation;
    overflow: hidden;
    transition: transform 0.08s;
  }

  .sitz:global(.gedrueckt) {
    transform: scale(0.95);
  }

  .sitz.positiv {
    background: var(--s-p-hell);
    border-color: var(--s-p);
  }

  .sitz.negativ {
    background: var(--s-m-hell);
    border-color: var(--s-m);
  }

  .name {
    font-weight: 600;
    font-size: clamp(0.8rem, 1.6vw, 1.15rem);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .marken {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.05rem 0.3rem;
    font-size: clamp(0.85rem, 1.5vw, 1.1rem);
    font-weight: 800;
    line-height: 1.1;
    color: var(--s-pp);
    min-height: 1.1em;
  }

  .marken .verhalten {
    font-weight: 400;
    font-size: 0.9em;
  }

  .marken .minus {
    color: var(--s-m);
  }

  .frei {
    border: 1px dashed var(--rand);
    border-radius: 12px;
    opacity: 0.6;
  }

  .ohne-platz {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    flex-wrap: wrap;
    padding: 0 0.8rem 0.8rem;
  }

  .chip {
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    display: flex;
    gap: 0.3rem;
  }

  .klein {
    gap: 0.35rem;
  }

  .knoepfe {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .knoepfe button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
    min-height: 68px;
  }

  .knoepfe strong {
    font-size: 1.4rem;
  }

  .knoepfe span {
    font-size: 0.8rem;
    color: var(--text-2);
  }

  .leistung {
    background: var(--s-p-hell);
  }

  .leistung.minus {
    background: var(--s-m-hell);
  }

  .verhalten.pos {
    background: var(--akzent-hell);
  }
</style>

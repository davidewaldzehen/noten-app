<script lang="ts">
  import { untrack } from 'svelte';
  import {
    ausgeschiedene,
    beobachtungenVon,
    daten,
    mitglieder,
    offeneStunde,
    stundeAbschliessen,
    stundeBeginnen,
    zeigeSnackbar,
  } from '../daten/store.svelte';
  import { heute, kurzdatum } from '../domain/datum';
  import { anzeigenamen } from '../domain/sitzplan';
  import { STUFEN, type Eindruck, type Id, type LeistungsStufe, type Lerngruppe, type Stufe } from '../domain/typen';
  import { STUFEN_ANZEIGE, vorschlag } from '../domain/vorschlag';
  import Kopf from './Kopf.svelte';
  import Overlay from './Overlay.svelte';
  import { geheZu } from './router.svelte';
  import SitzplanRaster from './SitzplanRaster.svelte';
  import { eindruckText, stufenKlasse } from './stufen';

  let { lg, stundeId }: { lg: Lerngruppe; stundeId?: Id } = $props();

  // Bearbeiten einer abgeschlossenen Stunde (stundeId) oder Abschluss der offenen Stunde.
  // Gibt es noch keine offene Stunde, wird sie erst beim Bestätigen angelegt.
  // Der Abschluss arbeitet mit dem Stand beim Öffnen; die Seite wird bei jedem Aufruf neu erzeugt.
  const { stunde, bearbeiten, beobachtungen, schueler, ohnePlatz } = untrack(() => {
    const stunde = stundeId ? daten.stunden.find((s) => s.id === stundeId) : offeneStunde(lg.id);
    const bearbeiten = !!stunde?.abgeschlossen;
    const schueler = [
      ...mitglieder(lg),
      // Ausgeschiedene nur, wenn sie in dieser Stunde schon einen Eindruck haben.
      ...ausgeschiedene(lg).filter((s) => bearbeiten && stunde!.eindruecke[s.id]),
    ];
    return {
      stunde,
      bearbeiten,
      beobachtungen: stunde ? beobachtungenVon(stunde.id) : [],
      schueler,
      ohnePlatz: schueler.filter((s) => !lg.sitzplan.plaetze.some((p) => p.schuelerId === s.id)),
    };
  });
  const namen = anzeigenamen(schueler);

  function leistungen(id: Id): LeistungsStufe[] {
    return beobachtungen.flatMap((b) => (b.schuelerId === id && b.art === 'leistung' ? [b.stufe] : []));
  }

  function vorgeschlagen(id: Id): Stufe {
    return vorschlag(leistungen(id), daten.einstellungen);
  }

  const ohneBeobachtung = new Set(schueler.filter((s) => leistungen(s.id).length === 0).map((s) => s.id));

  let eindruecke = $state<Record<Id, Eindruck>>(
    Object.fromEntries(
      schueler.map((s) => [
        s.id,
        bearbeiten ? (stunde!.eindruecke[s.id] ?? { art: 'ohne' }) : { art: 'stufe', stufe: vorgeschlagen(s.id) },
      ]),
    ),
  );
  let datum = $state(stunde?.datum ?? heute());
  let gewicht = $state(stunde?.gewicht ?? 1);
  let auswahlFuer = $state<Id | null>(null);

  const zaehler = $derived.by(() => {
    const werte = Object.values(eindruecke);
    return {
      abwesend: werte.filter((e) => e.art === 'abwesend').length,
      ohne: werte.filter((e) => e.art === 'ohne').length,
      anwesend: werte.filter((e) => e.art === 'stufe').length,
    };
  });

  function setze(id: Id, e: Eindruck) {
    eindruecke[id] = e;
    auswahlFuer = null;
  }

  function klasseVon(e: Eindruck): string {
    return e.art === 'stufe' ? stufenKlasse(e.stufe) : 'nicht-da';
  }

  function bestaetigen() {
    const s = stunde ?? stundeBeginnen(lg.id);
    stundeAbschliessen(s, $state.snapshot(eindruecke), datum, gewicht);
    zeigeSnackbar(bearbeiten ? 'Stunde geändert.' : `Stunde vom ${kurzdatum(datum)} abgeschlossen.`);
    geheZu(bearbeiten ? `lg/${lg.id}/stunden` : `lg/${lg.id}`);
  }
</script>

<div class="ansicht">
  <Kopf titel={bearbeiten ? `Stunde bearbeiten · ${lg.name}` : `Stundenabschluss · ${lg.name}`} zurueck={bearbeiten ? `#/lg/${lg.id}/stunden` : `#/lg/${lg.id}`}>
    {#snippet aktionen()}
      <input type="date" bind:value={datum} aria-label="Datum" />
      <div class="segment" role="group" aria-label="Länge">
        <button class:an={gewicht === 1} onclick={() => (gewicht = 1)}>Einzelstunde</button>
        <button class:an={gewicht === 2} onclick={() => (gewicht = 2)}>Doppelstunde</button>
      </div>
    {/snippet}
  </Kopf>

  <main class="plan">
    <SitzplanRaster plan={lg.sitzplan}>
      {#snippet platz(p)}
        {#if p.schuelerId && eindruecke[p.schuelerId]}
          {@const id = p.schuelerId}
          {@render sitz(id)}
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
        <div class="chip">{@render sitz(s.id)}</div>
      {/each}
    </div>
  {/if}

  <footer>
    <span class="leise">
      {zaehler.anwesend} mit Eindruck · {zaehler.abwesend} abwesend · {zaehler.ohne} ohne Eindruck
      {#if !bearbeiten}· gestrichelt = nicht angetippt (○){/if}
    </span>
    <button class="primaer gross" onclick={bestaetigen}>{bearbeiten ? 'Änderungen speichern' : 'Alle bestätigen'}</button>
  </footer>
</div>

{#snippet sitz(id: Id)}
  {@const e = eindruecke[id]}
  <button
    class={`sitz ${klasseVon(e)}`}
    class:unangetippt={!bearbeiten && ohneBeobachtung.has(id) && e.art === 'stufe' && e.stufe === 'o'}
    onclick={() => (auswahlFuer = id)}
  >
    <span class="name">{namen.get(id)}</span>
    <span class="wert">{eindruckText(e)}</span>
  </button>
{/snippet}

{#if auswahlFuer}
  {@const id = auswahlFuer}
  <Overlay schliessen={() => (auswahlFuer = null)}>
    <h2>{namen.get(id)}</h2>
    {#if !bearbeiten || beobachtungen.length > 0}
      <p class="leise">
        Beobachtungen: {leistungen(id).map((s) => (s === '-' ? '−' : s)).join(' ') || 'keine'} · Vorschlag: {STUFEN_ANZEIGE[vorgeschlagen(id)]}
      </p>
    {/if}
    <div class="stufen">
      {#each STUFEN as s}
        <button class={stufenKlasse(s)} onclick={() => setze(id, { art: 'stufe', stufe: s })}>{STUFEN_ANZEIGE[s]}</button>
      {/each}
    </div>
    <div class="zeile">
      <button onclick={() => setze(id, { art: 'ohne' })}>ohne Eindruck</button>
      <button onclick={() => setze(id, { art: 'abwesend' })}>abwesend</button>
      <span class="leer"></span>
      <button onclick={() => (auswahlFuer = null)}>Abbrechen</button>
    </div>
  </Overlay>
{/if}

<style>
  .ansicht {
    height: 100dvh;
    display: flex;
    flex-direction: column;
  }

  .segment {
    display: flex;
  }

  .segment button {
    border-radius: 0;
  }

  .segment button:first-child {
    border-radius: 8px 0 0 8px;
  }

  .segment button:last-child {
    border-radius: 0 8px 8px 0;
    border-left: none;
  }

  .segment .an {
    background: var(--akzent);
    color: var(--akzent-text);
    border-color: var(--akzent);
  }

  .plan {
    flex: 1;
    min-height: 0;
    padding: 0.6rem 0.8rem;
  }

  .sitz {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.1rem;
    padding: 0.25rem;
    min-height: 0;
    border-radius: 12px;
    border: 2px solid var(--s, var(--rand));
    background: var(--s-hell, var(--flaeche));
    overflow: hidden;
    width: 100%;
    height: 100%;
  }

  .sitz.unangetippt {
    border-style: dashed;
    background: var(--flaeche);
  }

  .sitz.nicht-da {
    background: var(--flaeche-2);
    border-color: var(--rand);
    color: var(--text-2);
  }

  .name {
    font-weight: 600;
    font-size: clamp(0.8rem, 1.5vw, 1.05rem);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .wert {
    font-size: clamp(1rem, 2.2vw, 1.6rem);
    font-weight: 700;
    color: var(--s, var(--text-2));
    line-height: 1;
  }

  .frei {
    border: 1px dashed var(--rand);
    border-radius: 12px;
    opacity: 0.5;
  }

  .ohne-platz {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    flex-wrap: wrap;
    padding: 0 0.8rem 0.5rem;
  }

  .chip {
    width: 110px;
    height: 64px;
    display: flex;
  }

  footer {
    display: flex;
    align-items: center;
    gap: 1rem;
    justify-content: space-between;
    padding: 0.6rem 1rem calc(0.6rem + env(safe-area-inset-bottom));
    background: var(--flaeche);
    border-top: 1px solid var(--rand);
  }

  .gross {
    min-height: 52px;
    padding: 0 2rem;
    font-size: 1.1rem;
  }

  .stufen {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.5rem;
  }

  .stufen button {
    min-height: 64px;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--s);
    background: var(--s-hell);
    border: 2px solid var(--s);
  }

  .leer {
    flex: 1;
  }
</style>

<script lang="ts">
  import { mitglieder, speichereLerngruppe, zeigeSnackbar } from '../daten/store.svelte';
  import {
    ANORDNUNGEN,
    anzeigenamen,
    nachNameSortiert,
    normalisiere,
    schluessel,
    sitzplanAus,
    verschiebe,
    verteile,
    type Anordnung,
  } from '../domain/sitzplan';
  import type { Id, Lerngruppe, Platz, Sitzplan } from '../domain/typen';
  import Kopf from './Kopf.svelte';
  import Overlay from './Overlay.svelte';
  import SitzplanRaster from './SitzplanRaster.svelte';

  let { lg }: { lg: Lerngruppe } = $props();

  type Auswahl = { art: 'liste'; id: Id } | { art: 'platz'; spalte: number; reihe: number } | null;
  type Zelle = { spalte: number; reihe: number };

  let modus = $state<'schueler' | 'plaetze'>('schueler');
  let werkzeug = $state<'zeichnen' | 'auswaehlen'>('zeichnen');
  let auswahl = $state<Auswahl>(null);
  /** Im Werkzeug „Auswählen“ markierte Plätze (Schlüssel „spalte|reihe“). */
  let markiert = $state(new Set<string>());
  /** Frühere Stände des Sitzplans für „Rückgängig“. */
  let verlauf = $state<string[]>([]);
  let anordnungOffen = $state(false);
  let anzahl = $state(30);
  let flaeche = $state<HTMLElement>();

  const plan = $derived(lg.sitzplan);
  const schueler = $derived(mitglieder(lg));
  const namen = $derived(anzeigenamen(schueler));
  const ohnePlatz = $derived(nachNameSortiert(schueler.filter((s) => !plan.plaetze.some((p) => p.schuelerId === s.id))));
  const fehlend = $derived(schueler.length - plan.plaetze.length);
  const freie = $derived(plan.plaetze.filter((p) => !p.schuelerId).length);

  function speichern() {
    speichereLerngruppe(lg);
  }

  function merken() {
    verlauf.push(JSON.stringify($state.snapshot(lg.sitzplan)));
    if (verlauf.length > 50) verlauf.shift();
  }

  function rueckgaengig() {
    const vorher = verlauf.pop();
    if (!vorher) return;
    lg.sitzplan = JSON.parse(vorher) as Sitzplan;
    markiert = new Set();
    auswahl = null;
    speichern();
  }

  function wechsle(m: typeof modus) {
    modus = m;
    auswahl = null;
    markiert = new Set();
  }

  function platzBei(spalte: number, reihe: number): Platz | undefined {
    return plan.plaetze.find((p) => p.spalte === spalte && p.reihe === reihe);
  }

  // ---------- Schüler setzen ----------

  function istAusgewaehlt(p: Platz) {
    return auswahl?.art === 'platz' && auswahl.spalte === p.spalte && auswahl.reihe === p.reihe;
  }

  function platzGetippt(p: Platz) {
    if (modus !== 'schueler') return;
    if (auswahl?.art === 'liste') {
      merken();
      p.schuelerId = auswahl.id;
      auswahl = null;
      speichern();
    } else if (auswahl?.art === 'platz') {
      const von = platzBei(auswahl.spalte, auswahl.reihe);
      if (von && !istAusgewaehlt(p)) {
        merken();
        [von.schuelerId, p.schuelerId] = [p.schuelerId, von.schuelerId];
        speichern();
      }
      auswahl = null;
    } else if (p.schuelerId) {
      auswahl = { art: 'platz', spalte: p.spalte, reihe: p.reihe };
    }
  }

  function listeGetippt(id: Id) {
    if (auswahl?.art === 'platz') {
      // Listenschüler setzt sich auf den gewählten Platz, der bisherige kommt in die Liste.
      const p = platzBei(auswahl.spalte, auswahl.reihe);
      if (p) {
        merken();
        p.schuelerId = id;
        speichern();
      }
      auswahl = null;
      return;
    }
    auswahl = auswahl?.art === 'liste' && auswahl.id === id ? null : { art: 'liste', id };
  }

  function vomPlatzNehmen() {
    if (auswahl?.art !== 'platz') return;
    const p = platzBei(auswahl.spalte, auswahl.reihe);
    if (p) {
      merken();
      p.schuelerId = undefined;
      speichern();
    }
    auswahl = null;
  }

  function automatisch() {
    merken();
    lg.sitzplan = verteile(plan, ohnePlatz.map((s) => s.id));
    speichern();
  }

  function alleRunter() {
    merken();
    for (const p of plan.plaetze) p.schuelerId = undefined;
    auswahl = null;
    speichern();
    zeigeSnackbar('Alle Schüler vom Plan genommen.', rueckgaengig);
  }

  // ---------- Plätze bearbeiten: Zeichnen und Auswählen per Finger ----------

  let strich: { art: 'setzen' | 'entfernen' | 'markieren' | 'entmarkieren'; besucht: Set<string>; geaendert: boolean } | null =
    null;

  function zelleBei(x: number, y: number): Zelle | null {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-s]');
    if (!el || !flaeche?.contains(el)) return null;
    return { spalte: Number(el.dataset.s), reihe: Number(el.dataset.r) };
  }

  function runter(e: PointerEvent) {
    if (modus !== 'plaetze' || e.button > 0) return;
    const z = zelleBei(e.clientX, e.clientY);
    if (!z) return;
    const vorhanden = !!platzBei(z.spalte, z.reihe);
    if (werkzeug === 'zeichnen') {
      // Der erste Strich entscheidet: auf leerem Feld begonnen = Plätze anlegen, auf einem Platz = entfernen.
      strich = { art: vorhanden ? 'entfernen' : 'setzen', besucht: new Set(), geaendert: false };
    } else {
      if (!vorhanden) {
        markiert = new Set();
        return;
      }
      strich = { art: markiert.has(schluessel(z)) ? 'entmarkieren' : 'markieren', besucht: new Set(), geaendert: false };
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    anwenden(z);
  }

  function bewegt(e: PointerEvent) {
    if (!strich) return;
    const z = zelleBei(e.clientX, e.clientY);
    if (z) anwenden(z);
  }

  function hoch() {
    if (!strich) return;
    const geaendert = strich.geaendert;
    strich = null;
    if (!geaendert) return;
    // Erst nach dem Strich zurechtrücken, damit das Raster nicht unter dem Finger wegspringt.
    const v = normalisiere(plan);
    markiert = new Set(
      [...markiert].map((k) => {
        const [s, r] = k.split('|').map(Number);
        return schluessel({ spalte: s + v.spalten, reihe: r + v.reihen });
      }),
    );
    speichern();
  }

  function anwenden(z: Zelle) {
    if (!strich) return;
    const k = schluessel(z);
    if (strich.besucht.has(k)) return;
    strich.besucht.add(k);
    const p = platzBei(z.spalte, z.reihe);
    if (strich.art === 'setzen' && !p) {
      if (!strich.geaendert) merken();
      strich.geaendert = true;
      plan.plaetze.push({ spalte: z.spalte, reihe: z.reihe });
    } else if (strich.art === 'entfernen' && p) {
      if (!strich.geaendert) merken();
      strich.geaendert = true;
      plan.plaetze = plan.plaetze.filter((x) => x !== p);
    } else if (strich.art === 'markieren' && p) {
      markiert = new Set([...markiert, k]);
    } else if (strich.art === 'entmarkieren' && p) {
      markiert = new Set([...markiert].filter((x) => x !== k));
    }
  }

  function pfeil(dx: number, dy: number) {
    if (markiert.size === 0) return;
    // Die Pfeile meinen die Richtung auf dem Bildschirm; bei „Tafel unten“ ist der Plan gedreht.
    const f = plan.tafelOben ? 1 : -1;
    merken();
    const neu = verschiebe(plan, markiert, dx * f, dy * f);
    if (!neu) {
      verlauf.pop();
      zeigeSnackbar('Da ist schon ein Platz im Weg.');
      return;
    }
    markiert = neu;
    speichern();
  }

  function markierteEntfernen() {
    merken();
    plan.plaetze = plan.plaetze.filter((p) => !markiert.has(schluessel(p)));
    markiert = new Set();
    normalisiere(plan);
    speichern();
  }

  function anordnungWaehlen() {
    anzahl = Math.max(schueler.length, 1);
    anordnungOffen = true;
  }

  function anordnungAnwenden(anordnung: Anordnung) {
    merken();
    const bisher = plan.plaetze
      .slice()
      .sort((a, b) => a.reihe - b.reihe || a.spalte - b.spalte)
      .flatMap((p) => (p.schuelerId ? [p.schuelerId] : []));
    lg.sitzplan = { ...verteile(sitzplanAus(anordnung, anzahl), bisher), tafelOben: plan.tafelOben };
    anordnungOffen = false;
    markiert = new Set();
    speichern();
    zeigeSnackbar(`${ANORDNUNGEN.find((a) => a.id === anordnung)?.name} übernommen.`, rueckgaengig, 5000);
  }
</script>

<div class="ansicht">
  <Kopf titel={lg.name} {lg} aktiv="sitzplan" />

  <div class="werkzeuge">
    <div class="segment" role="group">
      <button class:an={modus === 'schueler'} onclick={() => wechsle('schueler')}>Schüler setzen</button>
      <button class:an={modus === 'plaetze'} onclick={() => wechsle('plaetze')}>Plätze bearbeiten</button>
    </div>
    {#if modus === 'plaetze'}
      <button class="klein" onclick={anordnungWaehlen}>Anordnung wählen …</button>
      <div class="segment" role="group">
        <button class="klein" class:an={werkzeug === 'zeichnen'} onclick={() => ((werkzeug = 'zeichnen'), (markiert = new Set()))}>✎ Zeichnen</button>
        <button class="klein" class:an={werkzeug === 'auswaehlen'} onclick={() => (werkzeug = 'auswaehlen')}>⬚ Auswählen</button>
      </div>
      {#if werkzeug === 'auswaehlen'}
        <span class="zeile">
          <button class="klein" onclick={() => (markiert = new Set(plan.plaetze.map(schluessel)))}>Alle</button>
          <!-- Immer sichtbar, damit die Leiste beim Markieren nicht umbricht und der Plan unter dem Finger verrutscht. -->
          <span class="pfeile">
            <button class="klein" aria-label="nach links" disabled={markiert.size === 0} onclick={() => pfeil(-1, 0)}>←</button>
            <button class="klein" aria-label="nach oben" disabled={markiert.size === 0} onclick={() => pfeil(0, -1)}>↑</button>
            <button class="klein" aria-label="nach unten" disabled={markiert.size === 0} onclick={() => pfeil(0, 1)}>↓</button>
            <button class="klein" aria-label="nach rechts" disabled={markiert.size === 0} onclick={() => pfeil(1, 0)}>→</button>
          </span>
          <button class="klein gefahr" disabled={markiert.size === 0} onclick={markierteEntfernen}>Entfernen</button>
        </span>
      {/if}
    {:else}
      <button class="klein" onclick={automatisch} disabled={ohnePlatz.length === 0 || freie === 0}>Freie Plätze automatisch füllen</button>
      <button class="klein" onclick={alleRunter}>Alle vom Plan nehmen</button>
      {#if auswahl?.art === 'platz'}
        <button class="klein" onclick={vomPlatzNehmen}>Vom Platz nehmen</button>
      {/if}
    {/if}
    <span class="leer"></span>
    <button class="klein" onclick={rueckgaengig} disabled={verlauf.length === 0}>↶ Rückgängig</button>
    <button class="klein" title="Tafel unten = Sicht vom Pult" onclick={() => ((plan.tafelOben = !plan.tafelOben), speichern())}>
      {plan.tafelOben ? 'Tafel oben' : 'Tafel unten'} ⇅
    </button>
  </div>

  <p class="hilfe leise">
    <span class="zaehler" class:warnung={fehlend > 0}>
      {plan.plaetze.length} Plätze · {schueler.length} Schüler{#if fehlend > 0}&nbsp;– es fehlen {fehlend} Plätze{/if}
    </span>
    ·
    {#if modus === 'plaetze' && werkzeug === 'zeichnen'}
      Über leere Felder wischen legt Plätze an, über Plätze wischen entfernt sie. Am Rand ist immer Platz zum Erweitern.
    {:else if modus === 'plaetze'}
      Plätze antippen oder darüberwischen, um sie auszuwählen, dann mit den Pfeilen verschieben. Schüler wandern mit.
    {:else if auswahl?.art === 'liste'}
      Jetzt auf einen Platz tippen, um {namen.get(auswahl.id)} dorthin zu setzen.
    {:else if auswahl?.art === 'platz'}
      Jetzt auf einen anderen Platz tippen, um umzusetzen oder zu tauschen.
    {:else}
      Tippe links auf einen Schüler und dann auf einen Platz. Tippe auf einen besetzten Platz, um umzusetzen oder zu tauschen.
    {/if}
  </p>

  <div class="haupt">
    {#if modus === 'schueler'}
      <aside>
        <h3>Ohne Platz ({ohnePlatz.length})</h3>
        {#each ohnePlatz as s (s.id)}
          <button class="listeneintrag" class:gewaehlt={auswahl?.art === 'liste' && auswahl.id === s.id} onclick={() => listeGetippt(s.id)}>
            {s.vorname} {s.nachname}
          </button>
        {:else}
          <p class="leise">Alle Schüler haben einen Platz.</p>
        {/each}
      </aside>
    {/if}
    <main
      bind:this={flaeche}
      class:zeichnen={modus === 'plaetze'}
      onpointerdown={runter}
      onpointermove={bewegt}
      onpointerup={hoch}
      onpointercancel={hoch}
    >
      <SitzplanRaster {plan} rand={modus === 'plaetze' ? 1 : 0}>
        {#snippet platz(p)}
          <button
            class="platz"
            class:besetzt={!!p.schuelerId}
            class:gewaehlt={istAusgewaehlt(p) || markiert.has(schluessel(p))}
            onclick={() => platzGetippt(p)}
          >
            {p.schuelerId ? (namen.get(p.schuelerId) ?? '?') : ''}
          </button>
        {/snippet}
        {#snippet leer()}
          {#if modus === 'plaetze'}
            <div class="zelle-leer" aria-hidden="true">{werkzeug === 'zeichnen' ? '+' : ''}</div>
          {/if}
        {/snippet}
      </SitzplanRaster>
    </main>
  </div>
</div>

{#if anordnungOffen}
  <Overlay schliessen={() => (anordnungOffen = false)}>
    <h2>Anordnung wählen</h2>
    <div class="zeile">
      Plätze
      <button class="klein" onclick={() => (anzahl = Math.max(1, anzahl - 1))}>−</button>
      <input type="number" min="1" max="60" bind:value={anzahl} class="anzahl" />
      <button class="klein" onclick={() => (anzahl = Math.min(60, anzahl + 1))}>+</button>
      <span class="leise">({schueler.length} Schüler)</span>
    </div>
    <div class="anordnungen">
      {#each ANORDNUNGEN as a (a.id)}
        {@const vorschau = sitzplanAus(a.id, Math.min(60, Math.max(1, anzahl || 1)))}
        <button class="anordnung" onclick={() => anordnungAnwenden(a.id)}>
          <span class="mini" style={`aspect-ratio: ${vorschau.spalten} / ${vorschau.reihen}; grid-template-columns: repeat(${vorschau.spalten}, 1fr); grid-template-rows: repeat(${vorschau.reihen}, 1fr);`}>
            {#each vorschau.plaetze as x}
              <span style={`grid-column: ${x.spalte + 1}; grid-row: ${x.reihe + 1};`}></span>
            {/each}
          </span>
          <span>{a.name}</span>
        </button>
      {/each}
    </div>
    <p class="leise">Schüler, die schon sitzen, werden der Reihe nach übernommen. Danach kannst du alles frei anpassen.</p>
    <button onclick={() => (anordnungOffen = false)}>Abbrechen</button>
  </Overlay>
{/if}

<style>
  .ansicht {
    height: 100dvh;
    display: flex;
    flex-direction: column;
  }

  .werkzeuge {
    display: flex;
    gap: 0.8rem;
    align-items: center;
    flex-wrap: wrap;
    padding: 0.6rem 1rem 0;
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

  .pfeile {
    display: flex;
    gap: 0.2rem;
  }

  .pfeile button {
    min-width: 40px;
    font-size: 1.1rem;
  }

  .leer {
    flex: 1;
  }

  .hilfe {
    margin: 0.4rem 1rem;
    /* Einzeilig, damit sich der Plan beim Zeichnen nicht verschiebt. */
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .zaehler.warnung {
    color: var(--warnung);
    font-weight: 600;
  }

  .haupt {
    flex: 1;
    min-height: 0;
    display: flex;
    gap: 0.8rem;
    padding: 0 0.8rem 0.8rem;
  }

  aside {
    width: 200px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  main {
    flex: 1;
    min-width: 0;
  }

  main.zeichnen {
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }

  .listeneintrag {
    text-align: left;
  }

  .gewaehlt {
    outline: 3px solid var(--akzent);
    outline-offset: 1px;
    background: var(--akzent-hell) !important;
  }

  .platz {
    border-radius: 10px;
    border: 1px dashed var(--rand);
    background: var(--flaeche-2);
    font-weight: 600;
    padding: 0.2rem;
    min-height: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .platz.besetzt {
    border-style: solid;
    background: var(--flaeche);
    box-shadow: var(--schatten);
  }

  .zelle-leer {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px dotted var(--rand);
    border-radius: 8px;
    color: var(--text-2);
    opacity: 0.6;
  }

  .anzahl {
    width: 4.5rem;
    text-align: center;
  }

  .anordnungen {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
  }

  .anordnung {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    padding: 0.6rem 0.4rem;
    font-size: 0.8rem;
  }

  .mini {
    display: grid;
    gap: 1px;
    height: 56px;
    max-width: 100%;
  }

  .mini span {
    background: var(--akzent);
    border-radius: 1px;
  }
</style>

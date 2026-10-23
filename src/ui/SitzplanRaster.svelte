<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Platz, Sitzplan } from '../domain/typen';

  let {
    plan,
    platz,
    leer,
    rand = 0,
  }: {
    plan: Sitzplan;
    /** Inhalt eines Platzes. */
    platz: Snippet<[Platz]>;
    /** Inhalt einer Rasterzelle ohne Platz (nur im Editor). */
    leer?: Snippet<[{ spalte: number; reihe: number }]>;
    /** Zusätzliche leere Zellen rundherum, damit der Plan im Editor wachsen kann. */
    rand?: number;
  } = $props();

  const spalten = $derived(plan.spalten + 2 * rand);
  const reihen = $derived(plan.reihen + 2 * rand);

  // Reihe 0 ist vorne an der Tafel. „Tafel unten“ dreht den Plan um 180° (Sicht vom Pult).
  function stil(spalte: number, reihe: number) {
    const r = plan.tafelOben ? reihe + rand + 1 : reihen - reihe - rand;
    const s = plan.tafelOben ? spalte + rand + 1 : spalten - spalte - rand;
    return `grid-row: ${r}; grid-column: ${s};`;
  }

  // Gänge (Spalten/Reihen ganz ohne Plätze) werden schmaler, damit die Plätze mehr Raum bekommen.
  // Im Editor mit Rand bleiben alle Zellen gleich groß, damit man gut zeichnen kann.
  function spuren(anzahl: number, belegt: Set<number>) {
    const groessen = Array.from({ length: anzahl }, (_, i) => (rand > 0 || belegt.has(i - rand) ? '1fr' : '0.35fr'));
    if (!plan.tafelOben) groessen.reverse();
    return groessen.map((g) => `minmax(0, ${g})`).join(' ');
  }

  const vorlage = $derived(
    `grid-template-columns: ${spuren(spalten, new Set(plan.plaetze.map((p) => p.spalte)))};` +
      `grid-template-rows: ${spuren(reihen, new Set(plan.plaetze.map((p) => p.reihe)))};`,
  );

  const leereZellen = $derived.by(() => {
    if (!leer) return [];
    const belegt = new Set(plan.plaetze.map((p) => `${p.spalte}|${p.reihe}`));
    const zellen: { spalte: number; reihe: number }[] = [];
    for (let reihe = -rand; reihe < plan.reihen + rand; reihe++)
      for (let spalte = -rand; spalte < plan.spalten + rand; spalte++)
        if (!belegt.has(`${spalte}|${reihe}`)) zellen.push({ spalte, reihe });
    return zellen;
  });
</script>

<div class="plan" class:unten={!plan.tafelOben}>
  <div class="tafel">Tafel</div>
  <div class="raster" style={vorlage}>
    {#each leereZellen as z (`${z.spalte}|${z.reihe}`)}
      <div class="zelle" data-s={z.spalte} data-r={z.reihe} style={stil(z.spalte, z.reihe)}>{@render leer?.(z)}</div>
    {/each}
    {#each plan.plaetze as p (`${p.spalte}|${p.reihe}`)}
      <div class="zelle" data-s={p.spalte} data-r={p.reihe} style={stil(p.spalte, p.reihe)}>{@render platz(p)}</div>
    {/each}
  </div>
</div>

<style>
  .plan {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    height: 100%;
    min-height: 0;
  }

  .plan.unten {
    flex-direction: column-reverse;
  }

  .tafel {
    align-self: center;
    width: 40%;
    text-align: center;
    background: var(--flaeche-2);
    border: 1px solid var(--rand);
    border-radius: 6px;
    font-size: 0.8rem;
    color: var(--text-2);
    padding: 0.15rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .raster {
    flex: 1;
    min-height: 0;
    display: grid;
    gap: 0.45rem;
  }

  .zelle {
    min-width: 0;
    min-height: 0;
    display: flex;
  }

  .zelle > :global(*) {
    flex: 1;
    min-width: 0;
  }
</style>

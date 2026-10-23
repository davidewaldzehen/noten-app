<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Lerngruppe } from '../domain/typen';

  let {
    titel,
    zurueck = '#/',
    lg,
    aktiv,
    aktionen,
  }: {
    titel: string;
    zurueck?: string;
    lg?: Lerngruppe;
    aktiv?: string;
    aktionen?: Snippet;
  } = $props();

  const reiter = [
    { id: '', name: 'Unterricht' },
    { id: 'stunden', name: 'Stunden' },
    { id: 'nachweise', name: 'Leistungsnachweise' },
    { id: 'noten', name: 'Noten' },
    { id: 'schueler', name: 'Schüler' },
    { id: 'sitzplan', name: 'Sitzplan' },
    { id: 'einstellungen', name: 'Einstellungen' },
  ];
</script>

<header class="nicht-drucken">
  <div class="oben">
    <a class="zurueck" href={zurueck} aria-label="Zurück">‹</a>
    <h1>{titel}</h1>
    <div class="aktionen">{@render aktionen?.()}</div>
  </div>
  {#if lg}
    <nav>
      {#each reiter as r}
        <a href={`#/lg/${lg.id}${r.id ? '/' + r.id : ''}`} class:aktiv={aktiv === r.id}>{r.name}</a>
      {/each}
    </nav>
  {/if}
</header>

<style>
  header {
    background: var(--flaeche);
    border-bottom: 1px solid var(--rand);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .oben {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.4rem 1rem;
    min-height: 56px;
  }

  h1 {
    margin: 0;
    font-size: 1.2rem;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .zurueck {
    font-size: 2rem;
    line-height: 1;
    text-decoration: none;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
  }

  .aktionen {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  nav {
    display: flex;
    gap: 0.2rem;
    padding: 0 0.6rem;
    overflow-x: auto;
  }

  nav a {
    padding: 0.55rem 0.8rem;
    text-decoration: none;
    color: var(--text-2);
    border-bottom: 3px solid transparent;
    white-space: nowrap;
  }

  nav a.aktiv {
    color: var(--akzent);
    border-bottom-color: var(--akzent);
    font-weight: 600;
  }
</style>

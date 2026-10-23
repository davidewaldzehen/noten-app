<script lang="ts">
  import { daten, laden, lerngruppe, ui } from '../daten/store.svelte';
  import { route } from './router.svelte';
  import Start from './Start.svelte';
  import LerngruppeNeu from './LerngruppeNeu.svelte';
  import Einstellungen from './Einstellungen.svelte';
  import Unterricht from './Unterricht.svelte';
  import Stundenabschluss from './Stundenabschluss.svelte';
  import Stundenliste from './Stundenliste.svelte';
  import Nachweise from './Nachweise.svelte';
  import NachweisEingabe from './NachweisEingabe.svelte';
  import Notenuebersicht from './Notenuebersicht.svelte';
  import Schuelerbericht from './Schuelerbericht.svelte';
  import SchuelerVerwaltung from './SchuelerVerwaltung.svelte';
  import SitzplanEditor from './SitzplanEditor.svelte';
  import LerngruppeEinstellungen from './LerngruppeEinstellungen.svelte';
  import Snackbar from './Snackbar.svelte';

  laden().catch((e) => (ui.fehler = `Laden fehlgeschlagen: ${e}`));

  const t = $derived(route.teile);
  const lg = $derived(t[0] === 'lg' ? lerngruppe(t[1]) : undefined);
</script>

{#if ui.fehler}
  <div class="fehler nicht-drucken">
    {ui.fehler}
    <button class="klein" onclick={() => (ui.fehler = null)}>OK</button>
  </div>
{/if}

{#if !daten.geladen}
  <p class="seite leise">Lade …</p>
{:else if t.length === 0}
  <Start />
{:else if t[0] === 'neu'}
  <LerngruppeNeu />
{:else if t[0] === 'einstellungen'}
  <Einstellungen />
{:else if t[0] === 'lg' && lg}
  {#key lg.id + t.slice(2).join('/')}
    {#if t.length === 2}
      <Unterricht {lg} />
    {:else if t[2] === 'abschluss'}
      <Stundenabschluss {lg} stundeId={t[3]} />
    {:else if t[2] === 'stunden'}
      <Stundenliste {lg} />
    {:else if t[2] === 'nachweise'}
      <Nachweise {lg} />
    {:else if t[2] === 'nachweis' && t[3]}
      <NachweisEingabe {lg} nachweisId={t[3]} />
    {:else if t[2] === 'noten'}
      <Notenuebersicht {lg} />
    {:else if t[2] === 'bericht' && t[3]}
      <Schuelerbericht {lg} schuelerId={t[3]} />
    {:else if t[2] === 'schueler'}
      <SchuelerVerwaltung {lg} />
    {:else if t[2] === 'sitzplan'}
      <SitzplanEditor {lg} />
    {:else if t[2] === 'einstellungen'}
      <LerngruppeEinstellungen {lg} />
    {/if}
  {/key}
{:else}
  <div class="seite">
    <p>Diese Seite gibt es nicht.</p>
    <a href="#/">Zur Startseite</a>
  </div>
{/if}

<Snackbar />

<style>
  .fehler {
    background: var(--gefahr);
    color: white;
    padding: 0.6rem 1rem;
    display: flex;
    gap: 1rem;
    align-items: center;
    justify-content: space-between;
  }
</style>

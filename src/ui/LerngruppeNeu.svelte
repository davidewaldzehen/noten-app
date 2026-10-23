<script lang="ts">
  import { daten, lerngruppeAnlegen } from '../daten/store.svelte';
  import { heute, schuljahrVon } from '../domain/datum';
  import Kopf from './Kopf.svelte';
  import { geheZu } from './router.svelte';

  let name = $state('');
  let fach = $state('');
  let schuljahr = $state(schuljahrVon(heute()));

  const faecher = $derived([...new Set([...daten.lerngruppen.map((l) => l.fach), ...daten.fachvorlagen.map((v) => v.fach)])].filter(Boolean).sort());
  const vorlage = $derived(daten.fachvorlagen.find((v) => v.fach.toLowerCase() === fach.trim().toLowerCase()));

  function anlegen(e: SubmitEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const lg = lerngruppeAnlegen(name, fach, schuljahr);
    geheZu(`lg/${lg.id}/schueler`);
  }
</script>

<Kopf titel="Neue Lerngruppe" />

<form class="seite stapel" onsubmit={anlegen}>
  <div class="karte stapel">
    <label>
      Name der Lerngruppe
      <!-- svelte-ignore a11y_autofocus -->
      <input bind:value={name} placeholder="z. B. 7a Mathe oder WPK Französisch 7" autofocus required />
    </label>
    <label>
      Fach
      <input bind:value={fach} list="faecher" placeholder="z. B. Mathe" />
      <datalist id="faecher">
        {#each faecher as f}<option value={f}></option>{/each}
      </datalist>
    </label>
    <label>
      Schuljahr
      <input bind:value={schuljahr} placeholder="2026/27" />
    </label>
    <p class="leise">
      {#if vorlage}
        Notenbereiche werden aus der Fachvorlage „{vorlage.fach}“ übernommen:
        {vorlage.notenbereiche.map((b) => `${b.name} ${b.gewicht}`).join(' / ')}.
      {:else}
        Notenbereiche: Klassenarbeiten 50 % / Mündliche Note 50 %. Änderbar in den Einstellungen der Lerngruppe.
      {/if}
    </p>
  </div>
  <div class="zeile">
    <button type="submit" class="primaer" disabled={!name.trim()}>Anlegen und Schüler hinzufügen</button>
  </div>
</form>

<script lang="ts">
  import { beispieldaten } from '../daten/beispiel';
  import { daten, datenHinzufuegen, markierungenUmschalten, mitglieder, offeneStunde, schuelerMitId, zeigeSnackbar } from '../daten/store.svelte';
  import { heute } from '../domain/datum';
  import { haeufungen } from '../domain/haeufung';
  import type { Lerngruppe, Verhaltensbeobachtung } from '../domain/typen';

  const aktive = $derived(daten.lerngruppen.filter((l) => !l.archiviert).sort((a, b) => b.zuletztBenutzt - a.zuletztBenutzt));
  const archiv = $derived(daten.lerngruppen.filter((l) => l.archiviert).sort((a, b) => b.schuljahr.localeCompare(a.schuljahr)));

  const sicherungFaellig = $derived(
    daten.lerngruppen.length > 0 &&
      (daten.einstellungen.letzteSicherung === null || Date.now() - daten.einstellungen.letzteSicherung > 7 * 24 * 3600_000),
  );

  function hinweiseFuer(lg: Lerngruppe) {
    const verhalten = daten.beobachtungen.filter((b): b is Verhaltensbeobachtung => b.lerngruppeId === lg.id && b.art === 'verhalten');
    return haeufungen(verhalten, heute(), daten.einstellungen.haeufungAnzahl, daten.einstellungen.haeufungTage).map((h) => ({
      ...h,
      lg,
      schueler: schuelerMitId(h.schuelerId),
      kategorie: lg.verhaltenskategorien.find((k) => k.id === h.kategorieId),
    }));
  }

  const hinweise = $derived(aktive.flatMap(hinweiseFuer).filter((h) => h.schueler && h.kategorie));

  async function beispielAnlegen() {
    await datenHinzufuegen(beispieldaten());
    zeigeSnackbar('Beispiel-Lerngruppe mit erfundenen Schülern angelegt.');
  }
</script>

<div class="seite stapel">
  <div class="zeile kopf">
    <h1>Meine Lerngruppen</h1>
    <span class="leer"></span>
    <a href="#/einstellungen" class="knopf">⚙︎ Einstellungen</a>
  </div>

  {#if sicherungFaellig}
    <div class="hinweis zeile">
      <span>
        <strong>Sicherung fällig.</strong>
        {daten.einstellungen.letzteSicherung === null
          ? 'Du hast noch keine Sicherung erstellt.'
          : `Letzte Sicherung vor ${Math.floor((Date.now() - daten.einstellungen.letzteSicherung) / 86_400_000)} Tagen.`}
        Ohne Sicherung sind die Daten weg, wenn das Gerät kaputtgeht.
      </span>
      <a href="#/einstellungen" class="knopf">Jetzt sichern</a>
    </div>
  {/if}

  <div class="kacheln">
    {#each aktive as lg (lg.id)}
      {@const offen = offeneStunde(lg.id)}
      <a class="kachel karte" href={`#/lg/${lg.id}`}>
        <span class="name">{lg.name}</span>
        <span class="leise">{lg.fach} · {mitglieder(lg).length} Schüler</span>
        {#if offen}
          <span class="offen">Stunde offen</span>
        {/if}
      </a>
    {/each}
    <a class="kachel neu" href="#/neu">
      <span class="plus">+</span>
      <span>Neue Lerngruppe</span>
    </a>
  </div>

  {#if aktive.length === 0}
    <div class="karte stapel">
      <h2>Willkommen!</h2>
      <p>
        Leg eine Lerngruppe an, füge die Schüler ein und richte den Sitzplan ein. Zum Ausprobieren kannst du auch eine
        Beispiel-Lerngruppe mit erfundenen Schülern und sechs Wochen Verlauf erzeugen.
      </p>
      <div class="zeile">
        <a href="#/neu" class="knopf primaer">Neue Lerngruppe</a>
        <button onclick={beispielAnlegen}>Beispiel-Lerngruppe erzeugen</button>
      </div>
    </div>
  {/if}

  {#if hinweise.length > 0 && daten.einstellungen.markierungenVerbergen}
    <div class="karte zeile">
      <span class="leise">Hinweise zu Schülern sind verborgen.</span>
      <button class="klein" onclick={markierungenUmschalten}>Markierungen zeigen</button>
    </div>
  {:else if hinweise.length > 0}
    <div class="karte stapel">
      <h2>Häufungshinweise</h2>
      <p class="leise">
        Gleiche Verhaltensbeobachtung mindestens {daten.einstellungen.haeufungAnzahl}× in {daten.einstellungen.haeufungTage} Tagen.
      </p>
      <ul class="hinweise">
        {#each hinweise as h}
          <li>
            <a href={`#/lg/${h.lg.id}/bericht/${h.schuelerId}`}>
              <strong>{h.schueler!.vorname} {h.schueler!.nachname}</strong>
            </a>
            <span class="leise">({h.lg.name})</span>:
            {h.anzahl}× {h.kategorie!.symbol} {h.kategorie!.name}
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if archiv.length > 0}
    <details class="karte">
      <summary>Archiv ({archiv.length})</summary>
      <ul>
        {#each archiv as lg (lg.id)}
          <li><a href={`#/lg/${lg.id}/noten`}>{lg.name}</a> <span class="leise">{lg.schuljahr}</span></li>
        {/each}
      </ul>
    </details>
  {/if}
</div>

<style>
  .kopf h1 {
    margin: 0;
  }

  .leer {
    flex: 1;
  }

  .knopf {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0.5em 0.9em;
    border-radius: 8px;
    border: 1px solid var(--rand);
    background: var(--flaeche);
    text-decoration: none;
    color: var(--text);
  }

  .knopf.primaer {
    background: var(--akzent);
    border-color: var(--akzent);
    color: var(--akzent-text);
    font-weight: 600;
  }

  .kacheln {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 0.9rem;
  }

  .kachel {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    min-height: 120px;
    justify-content: center;
    text-decoration: none;
    color: var(--text);
  }

  .kachel .name {
    font-size: 1.3rem;
    font-weight: 700;
  }

  .kachel.neu {
    border: 2px dashed var(--rand);
    border-radius: var(--radius);
    align-items: center;
    color: var(--text-2);
  }

  .plus {
    font-size: 2rem;
    line-height: 1;
  }

  .offen {
    align-self: flex-start;
    background: var(--warnung-hell);
    color: var(--warnung);
    border-radius: 6px;
    padding: 0.1em 0.5em;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .hinweise {
    margin: 0;
    padding-left: 1.2rem;
  }

  .hinweise li {
    margin: 0.3rem 0;
  }

  summary {
    cursor: pointer;
    font-weight: 600;
  }
</style>

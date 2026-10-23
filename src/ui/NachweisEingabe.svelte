<script lang="ts">
  import {
    daten,
    mitglieder,
    nachweisLoeschen,
    punkteAusschalten,
    punkteEinschalten,
    punkteNeuBerechnen,
    punkteSetzen,
    schluesselvorlageSpeichern,
    speichereNachweis,
    zeigeSnackbar,
  } from '../daten/store.svelte';
  import { formatNote, formatNotentext, parseNote } from '../domain/noten';
  import { grenzenGueltig, lesePunkte, mindestpunkte, stufengrenzen } from '../domain/notenschluessel';
  import { nachNameSortiert } from '../domain/sitzplan';
  import type { Id, Lerngruppe } from '../domain/typen';
  import Kopf from './Kopf.svelte';
  import { geheZu } from './router.svelte';
  import { zahlAusFeld } from './zahlfeld';

  let { lg, nachweisId }: { lg: Lerngruppe; nachweisId: Id } = $props();

  const nachweis = $derived(daten.nachweise.find((n) => n.id === nachweisId));
  const schueler = $derived(nachNameSortiert(mitglieder(lg)));
  const bereiche = $derived(lg.notenbereiche.filter((b) => b.art === 'nachweise'));

  const auswertung = $derived.by(() => {
    if (!nachweis) return { schnitt: undefined, anzahl: 0, spiegel: [] as number[] };
    const noten = schueler.map((s) => parseNote(nachweis.noten[s.id])).filter((x): x is number => typeof x === 'number');
    const spiegel = [1, 2, 3, 4, 5, 6].map((g) => noten.filter((n) => Math.round(n) === g).length);
    return { schnitt: noten.length ? noten.reduce((a, b) => a + b, 0) / noten.length : undefined, anzahl: noten.length, spiegel };
  });

  function speichern() {
    if (nachweis) speichereNachweis(nachweis);
  }

  // ---------- Rohpunkte und Notenschlüssel ----------

  let neueHoechstpunkte = $state('');
  const zahl = (n: number) => String(n).replace('.', ',');

  /** Mindestpunkte je Note und Tendenz, eine Zeile je ganzer Note. */
  const punktetabelle = $derived.by(() => {
    const p = nachweis?.punkte;
    if (!p) return [];
    const grenzen = stufengrenzen(p.schluessel);
    return [1, 2, 3, 4, 5, 6].map((note) => {
      const ab = (t: string) => {
        const g = grenzen.find((x) => x.note === `${note}${t}`);
        return g ? mindestpunkte(g.ab, p.max) : undefined;
      };
      return { note, plus: ab('+'), ganz: ab(''), minus: ab('-') };
    });
  });

  function punkteAn() {
    if (!nachweis) return;
    const max = lesePunkte(neueHoechstpunkte, Infinity);
    if (!max) {
      zeigeSnackbar('Bitte die Höchstpunktzahl eintragen (ganze oder halbe Punkte).', undefined, 4000);
      return;
    }
    if (Object.keys(nachweis.noten).length > 0 && !confirm('Die schon eingetragenen Noten werden durch die Noten aus den Punkten ersetzt. Fortfahren?')) return;
    punkteEinschalten(nachweis, max);
    neueHoechstpunkte = '';
  }

  function punkteAus() {
    if (nachweis && confirm('Zurück zur Noteneingabe? Die Punkte werden verworfen, die berechneten Noten bleiben stehen.')) punkteAusschalten(nachweis);
  }

  function setzeHoechstpunkte(feld: HTMLInputElement) {
    const p = nachweis?.punkte;
    if (!p) return;
    const max = lesePunkte(feld.value, Infinity);
    if (!max) {
      feld.value = zahl(p.max);
      zeigeSnackbar('Ungültige Höchstpunktzahl (ganze oder halbe Punkte, größer 0).', undefined, 4000);
      return;
    }
    p.max = max;
    punkteNeuBerechnen(nachweis!);
  }

  function setzeGrenze(i: number, feld: HTMLInputElement) {
    const p = nachweis?.punkte;
    if (!p) return;
    const grenzen = [...p.schluessel.grenzen];
    grenzen[i] = Number(feld.value.replace(',', '.'));
    if (!grenzenGueltig(grenzen)) {
      feld.value = String(p.schluessel.grenzen[i]);
      zeigeSnackbar('Ungültige Grenze: Die Prozentwerte müssen von Note 1 bis 5 fallen und zwischen 0 und 100 liegen.', undefined, 4000);
      return;
    }
    p.schluessel.grenzen = grenzen;
    punkteNeuBerechnen(nachweis!);
  }

  function vorlageUebernehmen(name: string) {
    const v = daten.einstellungen.schluesselvorlagen.find((x) => x.name === name);
    if (!nachweis?.punkte || !v) return;
    nachweis.punkte.schluessel = { grenzen: [...v.grenzen], tendenzen: v.tendenzen };
    punkteNeuBerechnen(nachweis);
    zeigeSnackbar(`Notenschlüssel „${v.name}“ übernommen.`);
  }

  function alsVorlage() {
    if (!nachweis?.punkte) return;
    const name = prompt('Name der Vorlage (eine gleichnamige wird ersetzt):', daten.einstellungen.schluesselvorlagen[0]?.name ?? 'Standard');
    if (!name?.trim()) return;
    schluesselvorlageSpeichern(name, $state.snapshot(nachweis.punkte.schluessel));
    zeigeSnackbar(`Vorlage „${name.trim()}“ gespeichert.`);
  }

  function setzePunkte(id: Id, text: string) {
    if (nachweis) punkteSetzen(nachweis, id, text);
  }

  function setzeNote(id: Id, text: string) {
    if (!nachweis) return;
    if (text.trim() === '') delete nachweis.noten[id];
    else nachweis.noten[id] = text.trim();
    speichern();
  }

  // Eingabetaste springt zum nächsten Schüler.
  function weiter(e: KeyboardEvent, i: number) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const naechstes = document.querySelector<HTMLInputElement>(`[data-note-index="${i + 1}"]`);
    if (naechstes) naechstes.focus();
    else (e.target as HTMLInputElement).blur();
  }

  function loeschen() {
    if (nachweis && confirm(`„${nachweis.titel}“ mit allen Noten löschen?`)) {
      nachweisLoeschen(nachweis.id);
      geheZu(`lg/${lg.id}/nachweise`);
    }
  }
</script>

<Kopf titel={nachweis?.titel ?? 'Leistungsnachweis'} zurueck={`#/lg/${lg.id}/nachweise`}>
  {#snippet aktionen()}
    <button class="gefahr" onclick={loeschen}>Löschen</button>
  {/snippet}
</Kopf>

{#if nachweis}
  <div class="seite raster">
    <div class="karte stapel kopfdaten" class:mitschluessel={!!nachweis.punkte}>
      <label>Titel <input bind:value={nachweis.titel} onchange={speichern} /></label>
      <label>Datum <input type="date" bind:value={nachweis.datum} onchange={speichern} /></label>
      <label>
        Notenbereich
        <select bind:value={nachweis.notenbereichId} onchange={speichern}>
          {#each bereiche as b (b.id)}<option value={b.id}>{b.name}</option>{/each}
        </select>
      </label>
      <label>
        Gewicht im Notenbereich
        <input
          type="number"
          min="0"
          step="0.5"
          value={nachweis.gewicht}
          onchange={(e) => {
            const n = zahlAusFeld(e.currentTarget, { min: 0 }, nachweis.gewicht);
            if (n === undefined) return;
            nachweis.gewicht = n;
            speichern();
          }}
        />
      </label>
      <p class="leise">Gewicht 1 = normal, 0,5 = zählt halb.</p>
      {#if !nachweis.punkte}
        <div class="zeile unten">
          <label class="schmal">Höchstpunktzahl <input inputmode="decimal" bind:value={neueHoechstpunkte} placeholder="z. B. 48" /></label>
          <button onclick={punkteAn}>Punkte eintragen</button>
        </div>
      {/if}
      <div class="auswertung">
        <div><span class="leise">Schnitt</span> <strong class="zahl">{formatNote(auswertung.schnitt)}</strong></div>
        <div><span class="leise">Eingetragen</span> <strong class="zahl">{auswertung.anzahl} / {schueler.length}</strong></div>
        <table class="spiegel">
          <tbody>
            <tr>{#each [1, 2, 3, 4, 5, 6] as g}<th>{g}</th>{/each}</tr>
            <tr>{#each auswertung.spiegel as n}<td class="zahl">{n}</td>{/each}</tr>
          </tbody>
        </table>
      </div>
      {#if nachweis.punkte}
        {@const p = nachweis.punkte}
        <h3>Notenschlüssel</h3>
        <label class="schmal">
          Höchstpunktzahl
          <input inputmode="decimal" value={zahl(p.max)} onchange={(e) => setzeHoechstpunkte(e.currentTarget)} />
        </label>
        <div class="grenzen">
          {#each p.schluessel.grenzen as g, i}
            <label>{i + 1} ab % <input inputmode="decimal" value={g} onchange={(e) => setzeGrenze(i, e.currentTarget)} /></label>
          {/each}
        </div>
        <label class="haken">
          <input type="checkbox" bind:checked={p.schluessel.tendenzen} onchange={() => punkteNeuBerechnen(nachweis)} />
          Tendenzen (jede Note gedrittelt: oberes Drittel +, unteres −)
        </label>
        <table class="punktetabelle">
          <thead><tr><th>Note</th>{#if p.schluessel.tendenzen}<th>+</th>{/if}<th>{p.schluessel.tendenzen ? '' : 'ab Punkte'}</th>{#if p.schluessel.tendenzen}<th>−</th>{/if}</tr></thead>
          <tbody>
            {#each punktetabelle as z (z.note)}
              <tr>
                <th>{z.note}</th>
                {#if p.schluessel.tendenzen}<td class="zahl">{z.plus === undefined ? '' : zahl(z.plus)}</td>{/if}
                <td class="zahl">{z.ganz === undefined ? '' : zahl(z.ganz)}</td>
                {#if p.schluessel.tendenzen}<td class="zahl">{z.minus === undefined ? '' : zahl(z.minus)}</td>{/if}
              </tr>
            {/each}
          </tbody>
        </table>
        <p class="leise">Mindestpunkte je Note. Die Grenze muss erreicht werden; Punkte in halben Schritten.</p>
        <div class="zeile">
          {#if daten.einstellungen.schluesselvorlagen.length > 0}
            <select aria-label="Vorlage übernehmen" value="" onchange={(e) => { vorlageUebernehmen(e.currentTarget.value); e.currentTarget.value = ''; }}>
              <option value="" disabled>Vorlage übernehmen …</option>
              {#each daten.einstellungen.schluesselvorlagen as v (v.name)}<option value={v.name}>{v.name}</option>{/each}
            </select>
          {/if}
          <button onclick={alsVorlage}>Als Vorlage speichern</button>
          <button class="klein" onclick={punkteAus}>Noten statt Punkte</button>
        </div>
      {/if}
    </div>

    <div class="karte">
      {#if nachweis.punkte}
        <p class="leise">Punkte eintippen, z. B. <code>23</code> oder <code>23,5</code> (höchstens {zahl(nachweis.punkte.max)}). Die Note ergibt sich aus dem Notenschlüssel. Die Eingabetaste springt weiter.</p>
      {:else}
        <p class="leise">Note eintippen, z. B. <code>2</code>, <code>2-</code>, <code>3+</code> oder <code>2,5</code>. Die Eingabetaste springt weiter.</p>
      {/if}
      <table>
        <tbody>
          {#each schueler as s, i (s.id)}
            {@const text = nachweis.noten[s.id] ?? ''}
            {@const wert = parseNote(text)}
            {#if nachweis.punkte}
              {@const punkte = nachweis.punkte.werte[s.id] ?? ''}
              {@const gelesen = lesePunkte(punkte, nachweis.punkte.max)}
              <tr>
                <td>{s.nachname}, {s.vorname}</td>
                <td class="eingabe">
                  <input
                    data-note-index={i}
                    value={punkte}
                    class:ungueltig={gelesen === null}
                    aria-label={`Punkte ${s.vorname} ${s.nachname}`}
                    inputmode="decimal"
                    autocomplete="off"
                    enterkeyhint="next"
                    onchange={(e) => setzePunkte(s.id, e.currentTarget.value)}
                    onkeydown={(e) => weiter(e, i)}
                  />
                </td>
                <td class="zahl note">{gelesen === null ? '' : text ? formatNotentext(text) : ''}</td>
                <td class="zahl leise">{gelesen === null ? 'ungültig' : typeof wert === 'number' ? formatNote(wert) : ''}</td>
              </tr>
            {:else}
              <tr>
                <td>{s.nachname}, {s.vorname}</td>
                <td class="eingabe">
                  <input
                    data-note-index={i}
                    value={text}
                    class:ungueltig={wert === null}
                    autocomplete="off"
                    autocapitalize="off"
                    spellcheck="false"
                    enterkeyhint="next"
                    onchange={(e) => setzeNote(s.id, e.currentTarget.value)}
                    onkeydown={(e) => weiter(e, i)}
                  />
                </td>
                <td class="zahl leise">{wert === null ? 'ungültig' : wert === undefined ? '' : formatNote(wert)}</td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{:else}
  <p class="seite">Dieser Leistungsnachweis existiert nicht mehr.</p>
{/if}

<style>
  .raster {
    display: grid;
    grid-template-columns: minmax(240px, 320px) 1fr;
    gap: 1rem;
    align-items: start;
  }

  @media (max-width: 700px) {
    .raster {
      grid-template-columns: 1fr;
    }
  }

  .kopfdaten {
    position: sticky;
    top: 70px;
  }

  .kopfdaten.mitschluessel {
    position: static;
  }

  .auswertung {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .spiegel th,
  .spiegel td {
    text-align: center;
    padding: 0.2em;
  }

  .eingabe input {
    width: 90px;
    text-align: center;
    font-size: 1.1rem;
  }

  .schmal input {
    width: 120px;
  }

  .grenzen {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.3rem;
  }

  .grenzen input {
    width: 100%;
    min-width: 0;
    text-align: center;
  }

  .haken {
    flex-direction: row;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .punktetabelle th,
  .punktetabelle td {
    text-align: center;
    padding: 0.15em 0.4em;
  }

  .note {
    font-weight: 600;
    min-width: 2.5em;
  }

  .ungueltig {
    border-color: var(--gefahr);
    color: var(--gefahr);
  }
</style>

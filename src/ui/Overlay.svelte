<script lang="ts">
  import type { Snippet } from 'svelte';

  let { schliessen, children }: { schliessen?: () => void; children: Snippet } = $props();

  // Nur schließen, wenn die Berührung auch auf dem Hintergrund begonnen hat. Sonst würde das
  // Loslassen nach einem langen Druck (Finger liegt jetzt über dem Hintergrund) das Menü sofort schließen.
  let startAufHintergrund = false;
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
  class="overlay"
  onpointerdown={(e) => (startAufHintergrund = e.target === e.currentTarget)}
  onclick={(e) => {
    if (schliessen && startAufHintergrund && e.target === e.currentTarget) schliessen();
    startAufHintergrund = false;
  }}
>
  <div class="dialog stapel">
    {@render children()}
  </div>
</div>

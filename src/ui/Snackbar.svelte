<script lang="ts">
  import { ui } from '../daten/store.svelte';

  function rueckgaengig() {
    ui.snackbar?.rueckgaengig?.();
    ui.snackbar = null;
  }
</script>

{#if ui.snackbar}
  <div class="snackbar nicht-drucken" role="status">
    <span>{ui.snackbar.text}</span>
    {#if ui.snackbar.rueckgaengig}
      <button onclick={rueckgaengig}>Rückgängig</button>
    {/if}
  </div>
{/if}

<style>
  .snackbar {
    position: fixed;
    left: 50%;
    bottom: calc(1.2rem + env(safe-area-inset-bottom));
    transform: translateX(-50%);
    background: #222a26;
    color: #fff;
    border-radius: 12px;
    padding: 0.4rem 0.5rem 0.4rem 1.1rem;
    display: flex;
    gap: 1rem;
    align-items: center;
    box-shadow: 0 6px 24px rgb(0 0 0 / 0.3);
    z-index: 60;
    max-width: calc(100vw - 2rem);
  }

  button {
    background: transparent;
    border: none;
    color: #8fe0c4;
    font-weight: 700;
  }
</style>

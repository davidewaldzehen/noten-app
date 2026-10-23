// Svelte-Action: unterscheidet kurzen Tipp und langen Druck (Finger oder Maus).

export interface DruckOptionen {
  kurz: () => void;
  lang: () => void;
}

const LANG_MS = 450;
const TOLERANZ_PX = 12;

export function druck(node: HTMLElement, optionen: DruckOptionen) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let aktiv = false;
  let x = 0;
  let y = 0;

  function ende() {
    clearTimeout(timer);
    aktiv = false;
    node.classList.remove('gedrueckt');
  }

  function runter(e: PointerEvent) {
    if (e.button !== 0) return;
    aktiv = true;
    x = e.clientX;
    y = e.clientY;
    node.classList.add('gedrueckt');
    timer = setTimeout(() => {
      ende();
      navigator.vibrate?.(15);
      optionen.lang();
    }, LANG_MS);
  }

  function bewegt(e: PointerEvent) {
    if (aktiv && Math.hypot(e.clientX - x, e.clientY - y) > TOLERANZ_PX) ende();
  }

  function hoch() {
    if (!aktiv) return;
    ende();
    optionen.kurz();
  }

  function kontextmenue(e: Event) {
    e.preventDefault();
  }

  node.addEventListener('pointerdown', runter);
  node.addEventListener('pointermove', bewegt);
  node.addEventListener('pointerup', hoch);
  node.addEventListener('pointercancel', ende);
  node.addEventListener('pointerleave', ende);
  node.addEventListener('contextmenu', kontextmenue);

  return {
    update(neu: DruckOptionen) {
      optionen = neu;
    },
    destroy() {
      ende();
      node.removeEventListener('pointerdown', runter);
      node.removeEventListener('pointermove', bewegt);
      node.removeEventListener('pointerup', hoch);
      node.removeEventListener('pointercancel', ende);
      node.removeEventListener('pointerleave', ende);
      node.removeEventListener('contextmenu', kontextmenue);
    },
  };
}

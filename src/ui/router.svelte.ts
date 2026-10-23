// Einfache Navigation über den Teil der Adresse nach '#'.

export const route = $state({ teile: [] as string[] });

function lese() {
  route.teile = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
}

window.addEventListener('hashchange', lese);
lese();

export function geheZu(pfad: string) {
  location.hash = '#/' + pfad;
}

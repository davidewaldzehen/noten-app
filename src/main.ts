import { mount } from 'svelte';
import './app.css';
import App from './ui/App.svelte';

mount(App, { target: document.getElementById('app')! });

// Offline-Betrieb: nur in der veröffentlichten Version, nicht beim Entwickeln.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('Service Worker nicht registriert', e));
}

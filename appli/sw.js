/* Mes outils : service worker. Version à changer à chaque mise à jour de l'appli. */
const VERSION = 'mes-outils-2026-10-27d';
const SHELL = [
  '/appli/', '/appli/manifest.webmanifest', '/appli/icon-192.png', '/appli/icon-512.png',
  '/fonts/cormorant-garamond-latin-500-normal.woff2', '/fonts/cormorant-garamond-latin-400-italic.woff2',
  '/fonts/jost-latin-400-normal.woff2', '/fonts/jost-latin-500-normal.woff2',
  "/appli/img/accueillir-l-emotion-de-mon-enfant.webp",  "/appli/img/agenda-du-sommeil.webp",  "/appli/img/ancrage-5-4-3-2-1.webp",  "/appli/img/approche-et-fuite.webp",  "/appli/img/balance-decisionnelle.webp",  "/appli/img/calinotherapie.webp",  "/appli/img/cover-body.webp",  "/appli/img/cover-chat.webp",  "/appli/img/cover-meteo-enf.webp",  "/appli/img/cover-meteo.webp",  "/appli/img/cover-rayon.webp",  "/appli/img/cover-relax.webp",  "/appli/img/cover-resp.webp",  "/appli/img/cover-souffle.webp",  "/appli/img/echelle-des-etats.webp",  "/appli/img/eft-clinique.webp",  "/appli/img/exercices-de-respiration.webp",  "/appli/img/exercices-de-sophrologie.webp",  "/appli/img/fenetre-de-tolerance-A3.webp",  "/appli/img/fenetre-de-tolerance-li-icv.webp",  "/appli/img/fenetre-de-tolerance.webp",  "/appli/img/hier-ou-aujourd-hui.webp",  "/appli/img/la-co-regulation.webp",  "/appli/img/la-coherence-cardiaque.webp",  "/appli/img/la-crise-de-panique.webp",  "/appli/img/la-meteo-de-mes-emotions.webp",  "/appli/img/la-pleine-conscience.webp",  "/appli/img/la-relaxation.webp",  "/appli/img/la-roue-des-emotions.webp",  "/appli/img/le-cerveau-dans-la-main.webp",  "/appli/img/les-messagers-du-bien-etre.webp",  "/appli/img/logo.webp",  "/appli/img/ma-boite-d-apaisement.webp",  "/appli/img/me-parler-comme-a-un-ami.webp",  "/appli/img/mes-3-petits-bonheurs.webp",  "/appli/img/mes-5-moments-positifs.webp",  "/appli/img/mes-besoins-fondamentaux.webp",  "/appli/img/mes-petites-lueurs.webp",  "/appli/img/mon-carnet-des-declencheurs.webp",  "/appli/img/mon-thermometre-de-la-colere.webp",  "/appli/img/parler-en-je.webp",  "/appli/img/pendulation.webp",  "/appli/img/regulation-emotionnelle.webp",  "/appli/img/respirer-en-jouant.webp",  "/appli/img/traverser-l-absence.webp",
];
const AUDIO = 'mes-outils-audio';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== AUDIO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

/* Audio : enregistré au premier passage, puis lu hors connexion (gère les requêtes « Range » d'iPhone). */
async function audio(req) {
  const cache = await caches.open(AUDIO);
  const url = new URL(req.url); url.search = '';
  let full = await cache.match(url.href);
  if (!full) {
    try {
      const r = await fetch(url.href);
      if (r.ok && r.status === 200) { await cache.put(url.href, r.clone()); full = r; }
      else return fetch(req);
    } catch (e) { return fetch(req); }
  }
  const range = req.headers.get('range');
  if (!range) return full;
  const buf = await full.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  const start = m[1] ? +m[1] : 0, end = m[2] ? Math.min(+m[2], buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), { status: 206, headers: {
    'Content-Type': 'audio/mpeg', 'Content-Range': 'bytes ' + start + '-' + end + '/' + buf.byteLength,
    'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/appli/audio/')) { e.respondWith(audio(req)); return; }
  if (req.mode === 'navigate' && url.pathname.startsWith('/appli')) {
    /* page : réseau d'abord (pour avoir la dernière version), cache si hors connexion */
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(VERSION).then(k => k.put('/appli/', c)); return r; }).catch(() => caches.match('/appli/')));
    return;
  }
  if (url.pathname.startsWith('/appli/') || url.pathname.startsWith('/fonts/')) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(n => { if (n.ok) { const c = n.clone(); caches.open(VERSION).then(k => k.put(req, c)); } return n; })));
  }
});

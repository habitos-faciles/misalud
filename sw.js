/* Service worker de Hábitos Fáciles.
   - Archivos propios (index.html, iconos…): RED PRIMERO, y si no hay internet usa la copia guardada.
     Así cada versión nueva que subas a GitHub llega de inmediato (sin el problema de "versión vieja").
   - Librerías y tipografías externas (mapa Leaflet, Google Fonts): se guardan para que la app abra sin internet.
   - Todo lo demás (Google Forms/Sheets: registro, clave de acceso, VIP, ranking, consejo) NO se toca:
     pasa directo a internet, sin caché, para que la sincronización siempre lea datos frescos. */
var VERSION = 'habitos-faciles-v27.0';
var CACHE_APP = VERSION + '-app';
var CACHE_EXT = 'habitos-faciles-ext';
var PRECACHE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
var HOSTS_EXTERNOS_CACHEABLES = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_APP).then(function (c) { return c.addAll(PRECACHE); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k !== CACHE_APP && k !== CACHE_EXT;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // 1) Archivos propios: red primero, copia guardada si no hay internet
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req).then(function (resp) {
        if (resp && resp.ok) {
          var copia = resp.clone();
          caches.open(CACHE_APP).then(function (c) { c.put(req, copia); });
        }
        return resp;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error());
        });
      })
    );
    return;
  }

  // 2) Librerías/tipografías externas: guardar y servir desde copia (se refresca en segundo plano)
  if (HOSTS_EXTERNOS_CACHEABLES.indexOf(url.hostname) > -1) {
    e.respondWith(
      caches.open(CACHE_EXT).then(function (c) {
        return c.match(req).then(function (hit) {
          var red = fetch(req).then(function (resp) {
            if (resp && (resp.ok || resp.type === 'opaque')) c.put(req, resp.clone());
            return resp;
          }).catch(function () { return hit; });
          return hit || red;
        });
      })
    );
    return;
  }

  // 3) Cualquier otra cosa (Google Forms/Sheets, WhatsApp, etc.): directo a internet, sin intervenir
});

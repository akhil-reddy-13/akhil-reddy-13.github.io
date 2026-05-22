/* Navigation */
const sections = document.querySelectorAll('.section, .intro, .side-rail');
const navLinks = document.querySelectorAll('[data-nav]');

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      navLinks.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
      });
    });
  },
  { rootMargin: '-15% 0px -65% 0px', threshold: 0 }
);

sections.forEach((s) => {
  if (s.id) sectionObserver.observe(s);
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.06 }
);

document.querySelectorAll('.section').forEach((el) => revealObserver.observe(el));

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

function escapeHtml(str) {
  if (str == null) return '';
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}

function parseSpotifyUrl(url) {
  const m = String(url || '').match(/spotify\.com\/(playlist|album|track)\/([A-Za-z0-9]+)/);
  return m ? { kind: m[1], id: m[2] } : null;
}

function spotifyEmbedUrl(kind, id) {
  return `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator`;
}

function embedHeight(kind) {
  if (kind === 'playlist') return 380;
  if (kind === 'album') return 352;
  return 152;
}

function renderMusic(cfg, data) {
  const root = document.getElementById('music-widget');
  if (!root) return;

  const spotifyUrl = cfg.spotify_url || data.url || '';
  const parsed = parseSpotifyUrl(spotifyUrl);
  const embedUrl = data.embed_url || (parsed ? spotifyEmbedUrl(parsed.kind, parsed.id) : '');
  const title = cfg.title || data.title || 'Music';

  if (!embedUrl) {
    root.innerHTML =
      '<p class="music-empty">Paste a Spotify playlist, album, or track URL in <code>data/music.config.json</code>.</p>';
    return;
  }

  const height = embedHeight(parsed?.kind || 'track');
  root.innerHTML = `<div class="spotify-embed">
    <iframe
      src="${escapeHtml(embedUrl)}"
      title="${escapeHtml(title)} on Spotify"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
      style="height:${height}px"
    ></iframe>
  </div>`;
}

async function loadMusic() {
  const root = document.getElementById('music-widget');
  let cfg = {};
  let data = {};
  try {
    cfg = await (await fetch('data/music.config.json')).json();
  } catch {
    /* config optional */
  }
  try {
    data = await (await fetch('data/music.json')).json();
  } catch {
    /* json optional when config has spotify_url */
  }
  if (!cfg.spotify_url && !data.embed_url && !data.url) {
    if (root) {
      root.innerHTML =
        '<p class="music-empty">Could not load music. Check <code>data/music.config.json</code>.</p>';
    }
    return;
  }
  renderMusic(cfg, data);
}

function googleMapsUrl(cafe) {
  if (cafe.google_maps) return cafe.google_maps;
  const q = encodeURIComponent(`${cafe.name} ${cafe.address || ''}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function formatAddress(address) {
  if (!address) return '';
  return address.replace(/, CA \d{5}$/, '').trim();
}

function initCafeMap(cafes, onSelect) {
  const mapEl = document.getElementById('cafe-map');
  if (!mapEl || typeof L === 'undefined') return null;

  if (mapEl._leafletMap) {
    mapEl._leafletMap.remove();
    mapEl._leafletMap = null;
  }

  const map = L.map(mapEl, {
    zoomControl: false,
    attributionControl: true,
    scrollWheelZoom: false,
    touchZoom: true,
    dragging: true,
    doubleClickZoom: true,
    boxZoom: true,
  });
  mapEl._leafletMap = map;

  L.control.zoom({ position: 'topright' }).addTo(map);

  map.scrollWheelZoom.disable();
  mapEl.addEventListener('mouseenter', () => map.scrollWheelZoom.enable());
  mapEl.addEventListener('mouseleave', () => map.scrollWheelZoom.disable());

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
    attribution: '&copy; OSM &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20,
  }).addTo(map);

  const bounds = L.latLngBounds(cafes.map((c) => [c.lat, c.lng]));
  const markers = {};

  cafes.forEach((cafe) => {
    const marker = L.circleMarker([cafe.lat, cafe.lng], {
      radius: 7,
      color: '#1ed760',
      weight: 2,
      fillColor: '#1ed760',
      fillOpacity: 0.35,
    }).addTo(map);

    marker.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      onSelect(cafe.id, { pan: true });
    });

    markers[cafe.id] = marker;
  });

  function refreshMap() {
    map.invalidateSize(true);
    if (!map._userPanned) map.fitBounds(bounds.pad(0.15));
  }

  refreshMap();
  requestAnimationFrame(refreshMap);
  setTimeout(refreshMap, 100);
  setTimeout(refreshMap, 400);

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => refreshMap());
    ro.observe(mapEl.parentElement || mapEl);
  }

  map.on('dragstart zoomend', () => {
    map._userPanned = true;
  });

  return { map, markers, refreshMap };
}

function setActiveCafe(id, markers) {
  document.querySelectorAll('.cafe-item').forEach((el) => {
    el.classList.toggle('cafe-item--active', el.dataset.id === id);
  });
  if (markers) {
    Object.entries(markers).forEach(([mid, marker]) => {
      const on = mid === id;
      marker.setStyle({
        radius: on ? 9 : 7,
        fillOpacity: on ? 0.85 : 0.35,
        weight: on ? 3 : 2,
      });
      if (on) marker.bringToFront();
    });
  }
}

async function loadCafes() {
  const root = document.getElementById('cafes');
  if (!root) return;

  try {
    const data = await (await fetch('data/cafes.json')).json();
    const cafes = (data.cafes || []).slice().sort((a, b) => (b.score || 0) - (a.score || 0));

    if (!cafes.length) {
      root.innerHTML = '<p class="cafe-empty">Add cafes in <code>data/cafes.json</code></p>';
      return;
    }

    const listHtml = cafes
      .map((c) => {
        const emoji = c.emoji ? ` ${c.emoji}` : '';
        const addr = formatAddress(c.address);
        return `<button type="button" class="cafe-item" data-id="${escapeHtml(c.id)}">
          <span class="cafe-item__score">${c.score != null ? c.score.toFixed(1) : '—'}</span>
          <span class="cafe-item__body">
            <span class="cafe-item__name">${escapeHtml(c.name)}${emoji}</span>
            ${c.note ? `<span class="cafe-item__note">${escapeHtml(c.note)}</span>` : ''}
            ${addr ? `<span class="cafe-item__addr">${escapeHtml(addr)}</span>` : ''}
          </span>
        </button>`;
      })
      .join('');

    root.innerHTML = `
      <header class="cafe-widget__head">
        <span class="cafe-widget__icon" aria-hidden="true">☕</span>
        <span class="cafe-widget__title">Favorite Cafes</span>
      </header>
      <div class="cafe-widget__panel">
        <div class="cafe-widget__list" role="list">${listHtml}</div>
        <div class="cafe-widget__map-wrap">
          <div id="cafe-map" class="cafe-widget__map" role="application" aria-label="Map of rated cafes near Stanford"></div>
        </div>
      </div>
    `;

    const select = (id, opts = {}) => {
      const cafe = cafes.find((c) => c.id === id);
      if (!cafe) return;

      setActiveCafe(id, mapState?.markers);
      if (!mapState?.map) return;

      if (opts.pan) {
        mapState.map.panTo([cafe.lat, cafe.lng], { animate: true, duration: 0.35 });
      } else {
        const z = Math.max(mapState.map.getZoom(), 14);
        mapState.map.flyTo([cafe.lat, cafe.lng], z, { duration: 0.5 });
      }
    };

    let mapState = null;
    const bootMap = () => {
      mapState = initCafeMap(cafes, select);
      if (mapState) select(cafes[0].id);
    };

    requestAnimationFrame(() => requestAnimationFrame(bootMap));
    window.addEventListener('load', () => mapState?.refreshMap?.());

    root.querySelectorAll('.cafe-item').forEach((btn) => {
      btn.addEventListener('click', () => select(btn.dataset.id));
    });
  } catch {
    root.innerHTML = '<p class="cafe-empty">Could not load cafes.</p>';
  }
}

loadMusic();
loadCafes();

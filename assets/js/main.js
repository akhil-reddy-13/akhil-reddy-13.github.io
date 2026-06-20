/* Navigation — scroll spy + instant highlight on click */
const NAV_SECTION_IDS = ['home', 'experience', 'projects', 'education', 'writing'];
const navLinks = document.querySelectorAll('[data-nav]');

function getNavSections() {
  return NAV_SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean);
}

function setActiveNav(id) {
  navLinks.forEach((link) => {
    link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
  });
}

function updateActiveNav() {
  const sections = getNavSections();
  if (!sections.length) return;

  const isMobile = window.matchMedia('(max-width: 860px)').matches;
  const scrollY = window.scrollY || document.documentElement.scrollTop;
  const marker = scrollY + (isMobile ? 110 : Math.min(window.innerHeight * 0.28, 220));

  let activeId = sections[0].id;

  for (const el of sections) {
    const top = el.getBoundingClientRect().top + scrollY;
    if (top <= marker) activeId = el.id;
  }

  const doc = document.documentElement;
  if (scrollY + window.innerHeight >= doc.scrollHeight - 64) {
    activeId = sections[sections.length - 1].id;
  }

  setActiveNav(activeId);
}

let navScrollPending = false;
function scheduleNavUpdate() {
  if (navScrollPending) return;
  navScrollPending = true;
  requestAnimationFrame(() => {
    updateActiveNav();
    navScrollPending = false;
  });
}

['scroll', 'touchmove', 'touchend', 'touchcancel', 'resize'].forEach((evt) => {
  window.addEventListener(evt, scheduleNavUpdate, { passive: true, capture: true });
});
document.addEventListener('scroll', scheduleNavUpdate, { passive: true, capture: true });
window.addEventListener('scrollend', scheduleNavUpdate, { passive: true });

navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    const href = link.getAttribute('href');
    if (!href?.startsWith('#')) return;
    setActiveNav(href.slice(1));
    scheduleNavUpdate();
    window.setTimeout(scheduleNavUpdate, 120);
    window.setTimeout(scheduleNavUpdate, 400);
  });
});

updateActiveNav();

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
  return `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator&theme=0`;
}

const SPOTIFY_EMBED_SIZE = {
  playlist: { w: 400, h: 380 },
  album: { w: 400, h: 352 },
  track: { w: 400, h: 152 },
};

function sizeSpotifyEmbed(wrapper, kind) {
  const inner = wrapper?.querySelector('.spotify-embed__inner');
  const iframe = wrapper?.querySelector('iframe');
  const size = SPOTIFY_EMBED_SIZE[kind] || SPOTIFY_EMBED_SIZE.track;
  if (!inner || !iframe) return;

  const apply = () => {
    const width = wrapper.clientWidth || window.innerWidth;
    const scale = width / size.w;
    inner.style.height = `${Math.round(size.h * scale)}px`;
    iframe.style.width = `${size.w}px`;
    iframe.style.height = `${size.h}px`;
    iframe.style.transform = `scale(${scale})`;
  };

  apply();
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(apply);
    ro.observe(wrapper);
  } else {
    window.addEventListener('resize', apply, { passive: true });
  }
}

function renderMusic(cfg, data) {
  const root = document.getElementById('music-widget');
  if (!root) return;

  const spotifyUrl = cfg.spotify_url || data.url || '';
  const parsed = parseSpotifyUrl(spotifyUrl);
  const embedUrl = data.embed_url || (parsed ? spotifyEmbedUrl(parsed.kind, parsed.id) : '');
  const title = cfg.title || data.title || 'Music';
  const kind = parsed?.kind || 'track';

  if (!embedUrl) {
    root.innerHTML =
      '<p class="music-empty">Paste a Spotify playlist, album, or track URL in <code>data/music.config.json</code>.</p>';
    return;
  }

  root.innerHTML = `<div class="spotify-embed">
    <div class="spotify-embed__inner">
      <iframe
        src="${escapeHtml(embedUrl)}"
        title="${escapeHtml(title)} on Spotify"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      ></iframe>
    </div>
  </div>`;

  sizeSpotifyEmbed(root.querySelector('.spotify-embed'), kind);
}

async function loadMusic() {
  const root = document.getElementById('music-widget');
  let cfg = {};
  try {
    cfg = await (await fetch('data/music.config.json')).json();
  } catch {
    if (root) {
      root.innerHTML =
        '<p class="music-empty">Could not load music. Check <code>data/music.config.json</code>.</p>';
    }
    return;
  }
  if (!cfg.spotify_url) {
    if (root) {
      root.innerHTML =
        '<p class="music-empty">Add a Spotify playlist, album, or track URL in <code>data/music.config.json</code>.</p>';
    }
    return;
  }
  renderMusic(cfg, {});
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

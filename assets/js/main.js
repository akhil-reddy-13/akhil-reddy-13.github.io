/* Navigation — scroll spy (iOS-safe via viewport + intersection) */
const NAV_SECTION_IDS = ['home', 'experience', 'projects', 'education', 'photos', 'writing'];
const navLinks = document.querySelectorAll('[data-nav]');

function getNavSections() {
  return NAV_SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean);
}

function setActiveNav(id) {
  navLinks.forEach((link) => {
    link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
  });
}

function pickActiveSection() {
  const sections = getNavSections();
  if (!sections.length) return;

  const isMobile = window.matchMedia('(max-width: 860px)').matches;
  const scrollY = window.scrollY || document.documentElement.scrollTop;
  const doc = document.documentElement;

  if (scrollY + window.innerHeight >= doc.scrollHeight - 48) {
    setActiveNav(sections[sections.length - 1].id);
    return;
  }

  if (scrollY <= (isMobile ? 96 : 32)) {
    setActiveNav('home');
    return;
  }

  const probeY = isMobile ? 112 : Math.min(window.innerHeight * 0.3, 220);
  const bottomEdge = isMobile ? window.innerHeight - 68 : window.innerHeight;

  let bestId = sections[0].id;
  let bestDist = Infinity;

  for (const el of sections) {
    const rect = el.getBoundingClientRect();
    if (rect.bottom < probeY || rect.top > bottomEdge) continue;

    const dist = Math.abs(rect.top - probeY);
    if (dist < bestDist) {
      bestDist = dist;
      bestId = el.id;
    }
  }

  setActiveNav(bestId);
}

let navScrollPending = false;
function scheduleNavUpdate() {
  if (navScrollPending) return;
  navScrollPending = true;
  requestAnimationFrame(() => {
    pickActiveSection();
    navScrollPending = false;
  });
}

['scroll', 'touchmove', 'touchend', 'touchcancel', 'resize', 'orientationchange'].forEach((evt) => {
  window.addEventListener(evt, scheduleNavUpdate, { passive: true, capture: true });
});
document.addEventListener('scroll', scheduleNavUpdate, { passive: true, capture: true });
window.addEventListener('scrollend', scheduleNavUpdate, { passive: true });

if (window.visualViewport) {
  window.visualViewport.addEventListener('scroll', scheduleNavUpdate, { passive: true });
  window.visualViewport.addEventListener('resize', scheduleNavUpdate, { passive: true });
}

const navSections = getNavSections();
if (navSections.length && typeof IntersectionObserver !== 'undefined') {
  const navObserver = new IntersectionObserver(scheduleNavUpdate, {
    threshold: [0, 0.08, 0.2, 0.35, 0.5, 0.75, 1],
    rootMargin: '-72px 0px -68px 0px',
  });
  navSections.forEach((el) => navObserver.observe(el));
}

navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    const href = link.getAttribute('href');
    if (!href?.startsWith('#')) return;
    setActiveNav(href.slice(1));
    window.setTimeout(scheduleNavUpdate, 50);
    window.setTimeout(scheduleNavUpdate, 350);
    window.setTimeout(scheduleNavUpdate, 700);
  });
});

scheduleNavUpdate();

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
  playlist: { w: 400, h: 380, mobileH: 232 },
  album: { w: 400, h: 352, mobileH: 232 },
  track: { w: 400, h: 152, mobileH: 152 },
};

function spotifyEmbedDimensions(kind) {
  const size = SPOTIFY_EMBED_SIZE[kind] || SPOTIFY_EMBED_SIZE.track;
  const mobile = window.matchMedia('(max-width: 860px)').matches;
  if (mobile) return { w: size.w, h: size.mobileH ?? size.h };
  return { w: size.w, h: size.h };
}

function sizeSpotifyEmbed(wrapper, kind) {
  const inner = wrapper?.querySelector('.spotify-embed__inner');
  const iframe = wrapper?.querySelector('iframe');
  if (!inner || !iframe) return;

  const apply = () => {
    const mobile = window.matchMedia('(max-width: 860px)').matches;
    const size = spotifyEmbedDimensions(kind);

    if (mobile) {
      inner.style.height = `${size.h}px`;
      iframe.style.width = '100%';
      iframe.style.height = `${size.h}px`;
      iframe.style.transform = 'none';
      return;
    }

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
        return `<button type="button" class="cafe-item" data-id="${escapeHtml(c.id)}" data-cuelume-press>
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
loadPhotos();

async function loadPhotos() {
  const root = document.getElementById('photo-gallery');
  if (!root) return;

  try {
    const data = await (await fetch('data/photos.json')).json();
    const photos = Array.isArray(data.photos) ? data.photos : Array.isArray(data) ? data : [];
    if (!photos.length) {
      root.innerHTML =
        '<p class="photo-empty">No photos yet. Drop images into <code>images/photos/</code> and run <code>npm run photos:optimize</code>.</p>';
      return;
    }

    root.innerHTML = photos
      .map((p, i) => {
        const src = escapeHtml(p.src || '');
        const date = escapeHtml(p.date || '');
        const alt = escapeHtml(p.alt || p.caption || 'Photo');
        const ratio =
          Number(p.w) > 0 && Number(p.h) > 0 ? ` style="aspect-ratio:${Number(p.w)}/${Number(p.h)}"` : '';
        return `<button type="button" class="photo-card" data-index="${i}" data-cuelume-press aria-label="${alt}">
          <img class="photo-card__img" src="${src}" alt="${alt}" loading="lazy"${ratio} />
          ${date ? `<span class="photo-card__date">${date}</span>` : ''}
        </button>`;
      })
      .join('');

    let lightbox = document.getElementById('photo-lightbox');
    if (!lightbox) {
      lightbox = document.createElement('div');
      lightbox.id = 'photo-lightbox';
      lightbox.className = 'photo-lightbox';
      lightbox.setAttribute('role', 'dialog');
      lightbox.setAttribute('aria-modal', 'true');
      lightbox.setAttribute('aria-hidden', 'true');
      lightbox.innerHTML = `
        <div class="photo-lightbox__inner">
          <button type="button" class="photo-lightbox__close" aria-label="Close">&times;</button>
          <button type="button" class="photo-lightbox__nav photo-lightbox__nav--prev" aria-label="Previous">‹</button>
          <button type="button" class="photo-lightbox__nav photo-lightbox__nav--next" aria-label="Next">›</button>
          <img class="photo-lightbox__img" src="" alt="" />
          <p class="photo-lightbox__caption"></p>
        </div>`;
      document.body.appendChild(lightbox);
    }

    const lbImg = lightbox.querySelector('.photo-lightbox__img');
    const lbCap = lightbox.querySelector('.photo-lightbox__caption');
    const lbClose = lightbox.querySelector('.photo-lightbox__close');
    const lbPrev = lightbox.querySelector('.photo-lightbox__nav--prev');
    const lbNext = lightbox.querySelector('.photo-lightbox__nav--next');
    let current = 0;

    function show(index) {
      current = (index + photos.length) % photos.length;
      const p = photos[current];
      lbImg.src = p.src;
      lbImg.alt = p.alt || p.caption || 'Photo';
      lbCap.textContent = p.date || p.caption || '';
    }

    function openLightbox(index) {
      show(index);
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      lbImg.removeAttribute('src');
    }

    root.querySelectorAll('.photo-card').forEach((btn) => {
      btn.addEventListener('click', () => openLightbox(Number(btn.dataset.index)));
    });
    lbClose.addEventListener('click', closeLightbox);
    lbPrev.addEventListener('click', (e) => {
      e.stopPropagation();
      show(current - 1);
    });
    lbNext.addEventListener('click', (e) => {
      e.stopPropagation();
      show(current + 1);
    });
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });
  } catch {
    root.innerHTML = '<p class="photo-empty">Could not load photos.</p>';
  }
}

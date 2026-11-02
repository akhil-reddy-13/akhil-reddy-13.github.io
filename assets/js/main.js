/* Navigation — scroll spy (iOS-safe via viewport + intersection) */
const NAV_SECTION_IDS = ['home', 'experience', 'projects', 'education', 'writing', 'photos'];
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
  // Spotify only has two layouts: compact (152) and full (352+). Anything in
  // between renders the compact card with dead space under it.
  playlist: { w: 400, h: 380, mobileH: 152 },
  album: { w: 400, h: 352, mobileH: 152 },
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
    const size = spotifyEmbedDimensions(kind);

    // Below the two-column layout, use Spotify's native sizes at full width:
    // compact (152) on phones, full (352) once there's room (unfolded, tablet).
    if (!window.matchMedia('(min-width: 1100px)').matches) {
      const roomy = (wrapper.clientWidth || window.innerWidth) >= 560;
      const h = kind === 'track' ? 152 : roomy ? 352 : size.h;
      inner.style.height = `${h}px`;
      iframe.style.width = '100%';
      iframe.style.height = `${h}px`;
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
  return address.replace(/,\s*[A-Z]{2}\s+\d{5}(-\d{4})?$/, '').trim();
}

const hasCoords = (c) => Number.isFinite(c.lat) && Number.isFinite(c.lng);

function initCafeMap(cafes, onSelect) {
  const mapEl = document.getElementById('cafe-map');
  if (!mapEl || typeof L === 'undefined' || !cafes.some(hasCoords)) return null;

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

  const zoomCtl = L.control.zoom({ position: 'topright' }).addTo(map);

  map.scrollWheelZoom.disable();
  mapEl.addEventListener('mouseenter', () => map.scrollWheelZoom.enable());
  mapEl.addEventListener('mouseleave', () => map.scrollWheelZoom.disable());

  // Esri dark gray canvas: keyless (CARTO's dark_all now requires an API key).
  const esri = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas';
  L.tileLayer(`${esri}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, {
    attribution: '&copy; Esri',
    maxZoom: 16,
  }).addTo(map);
  L.tileLayer(`${esri}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, {
    maxZoom: 16,
  }).addTo(map);

  // One marker per cafe; the number is its rank within its own region.
  const markers = {};
  cafes.forEach((cafe) => {
    if (!hasCoords(cafe)) return;
    const marker = L.marker([cafe.lat, cafe.lng], {
      icon: L.divIcon({
        className: 'cafe-pin',
        html: `<span>${cafe._rank}</span>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
      title: cafe.name,
      riseOnHover: true,
    }).addTo(map);

    marker.bindTooltip(escapeHtml(cafe.name), {
      direction: 'top',
      offset: [0, -12],
      className: 'cafe-tip',
    });

    marker.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      onSelect(cafe.id, { pan: true });
    });

    markers[cafe.id] = marker;
  });

  // Frame the cluster around a region's top cafe; far-flung ones fly in on select.
  let bounds = null;
  function frame(list) {
    const located = list.filter(hasCoords);
    if (!located.length) return;
    // Keep everything except true outliers: within 3x the median distance
    // from the top cafe (min 1.5 km). Tight downtown clusters stay readable,
    // spread-out metros still fit on screen.
    const top = L.latLng(located[0].lat, located[0].lng);
    const dist = located.map((c) => top.distanceTo([c.lat, c.lng]));
    const sorted = dist.slice(1).sort((a, b) => a - b);
    const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
    const limit = Math.max(median * 3, 1500);
    const near = located.filter((_, i) => dist[i] <= limit);
    bounds = L.latLngBounds((near.length > 1 ? near : located).map((c) => [c.lat, c.lng]));
    map._userPanned = false;
    refreshMap();
  }

  function refreshMap() {
    map.invalidateSize(true);
    if (bounds && !map._userPanned) map.fitBounds(bounds.pad(0.2), { maxZoom: 16 });
  }

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => refreshMap());
    ro.observe(mapEl.parentElement || mapEl);
  }

  map.on('dragstart', () => {
    map._userPanned = true;
  });
  mapEl.addEventListener('wheel', () => { map._userPanned = true; }, { passive: true });
  mapEl.addEventListener('touchstart', (e) => { if (e.touches.length > 1) map._userPanned = true; }, { passive: true });
  zoomCtl.getContainer().addEventListener('click', () => {
    map._userPanned = true;
  });

  return { map, markers, frame, refreshMap };
}

function setActiveCafe(id, markers) {
  document.querySelectorAll('.cafe-item').forEach((el) => {
    el.classList.toggle('cafe-item--active', el.dataset.id === id);
  });
  if (markers) {
    Object.entries(markers).forEach(([mid, marker]) => {
      const on = mid === id;
      marker.getElement()?.classList.toggle('cafe-pin--active', on);
      marker.setZIndexOffset(on ? 1000 : 0);
      if (on) marker.openTooltip();
      else marker.closeTooltip();
    });
  }
}

function cafeItemHtml(c) {
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

    // Group by region, ordered by each region's best score; rank within region.
    const regions = [];
    const byRegion = new Map();
    cafes.forEach((c) => {
      const r = c.region || data.region || 'Cafes';
      if (!byRegion.has(r)) {
        byRegion.set(r, []);
        regions.push(r);
      }
      const list = byRegion.get(r);
      list.push(c);
      c._rank = list.length;
    });

    const tabs =
      regions.length > 1
        ? `<div class="cafe-widget__regions" role="tablist" aria-label="Region">${regions
            .map(
              (r, i) =>
                `<button type="button" role="tab" class="cafe-widget__region" data-region="${escapeHtml(r)}" aria-selected="${i === 0}" data-cuelume-toggle>${escapeHtml(r)}</button>`
            )
            .join('')}</div>`
        : '';

    root.innerHTML = `
      <header class="cafe-widget__head">
        <span class="cafe-widget__icon" aria-hidden="true">☕</span>
        <span class="cafe-widget__title">Favorite Cafes</span>
        ${tabs}
        <a class="cafe-widget__directions" href="${googleMapsUrl(cafes[0])}" target="_blank" rel="noopener" data-cuelume-hover="tick">Maps ↗</a>
      </header>
      <div class="cafe-widget__panel">
        <div class="cafe-widget__list" role="list"></div>
        <div class="cafe-widget__map-wrap">
          <div id="cafe-map" class="cafe-widget__map" role="application" aria-label="Map of rated cafes"></div>
        </div>
      </div>
    `;

    const listEl = root.querySelector('.cafe-widget__list');
    let mapState = null;
    let region = regions[0];

    const select = (id, opts = {}) => {
      const cafe = cafes.find((c) => c.id === id);
      if (!cafe) return;

      const dir = root.querySelector('.cafe-widget__directions');
      if (dir) {
        dir.href = googleMapsUrl(cafe);
        dir.setAttribute('aria-label', `Open ${cafe.name} in Google Maps`);
      }
      setActiveCafe(id, mapState?.markers);
      if (!mapState?.map || opts.quiet || !hasCoords(cafe)) return;
      mapState.map._userPanned = true;

      if (opts.pan) {
        mapState.map.panTo([cafe.lat, cafe.lng], { animate: true, duration: 0.35 });
      } else {
        const z = Math.max(mapState.map.getZoom(), 15);
        mapState.map.flyTo([cafe.lat, cafe.lng], z, { duration: 0.5 });
      }
    };

    const showRegion = (r) => {
      region = r;
      const list = byRegion.get(r);
      listEl.innerHTML = list.map(cafeItemHtml).join('');
      listEl.scrollTop = 0;
      listEl.querySelectorAll('.cafe-item').forEach((btn) => {
        btn.addEventListener('click', () => select(btn.dataset.id));
      });
      root.querySelectorAll('.cafe-widget__region').forEach((b) => {
        b.setAttribute('aria-selected', String(b.dataset.region === r));
      });
      mapState?.frame(list);
      select(list[0].id, { quiet: true });
    };

    root.querySelectorAll('.cafe-widget__region').forEach((b) => {
      b.addEventListener('click', () => b.dataset.region !== region && showRegion(b.dataset.region));
    });

    showRegion(region);

    const bootMap = () => {
      mapState = initCafeMap(cafes, select);
      if (!mapState) return;
      const list = byRegion.get(region);
      mapState.frame(list);
      [100, 400].forEach((ms) => setTimeout(mapState.refreshMap, ms));
      select(list[0].id, { quiet: true });
    };

    requestAnimationFrame(() => requestAnimationFrame(bootMap));
    window.addEventListener('load', () => mapState?.refreshMap?.());
  } catch {
    root.innerHTML = '<p class="cafe-empty">Could not load cafes.</p>';
  }
}

/* Phones: mirror the sidebar socials under the intro (one source of truth). */
(function mirrorSocials() {
  const src = document.querySelector('.sidebar__socials');
  const dest = document.querySelector('.intro__socials');
  if (!src || !dest) return;
  dest.innerHTML = src.innerHTML;
})();

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
        const caption = escapeHtml(p.caption || '');
        const date = escapeHtml(p.date || '');
        const alt = escapeHtml(p.alt || p.caption || 'Photo');
        const label = [caption, date].filter(Boolean).join(' · ');
        const ratio =
          Number(p.w) > 0 && Number(p.h) > 0 ? ` style="aspect-ratio:${Number(p.w)}/${Number(p.h)}"` : '';
        return `<button type="button" class="photo-card" data-index="${i}" data-cuelume-press aria-label="${alt}">
          <img class="photo-card__img" src="${src}" alt="${alt}" loading="lazy"${ratio} />
          ${label ? `<span class="photo-card__label"><span class="photo-card__caption">${caption || date}</span>${caption && date ? `<span class="photo-card__date">${date}</span>` : ''}</span>` : ''}
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
      lbCap.textContent = [p.caption, p.date].filter(Boolean).join(' · ');
    }

    function openLightbox(index) {
      show(index);
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.classList.add('photo-lightbox-open');
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('photo-lightbox-open');
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

    let touchX = null;
    lightbox.addEventListener(
      'touchstart',
      (e) => {
        touchX = e.changedTouches[0]?.clientX ?? null;
      },
      { passive: true }
    );
    lightbox.addEventListener(
      'touchend',
      (e) => {
        if (touchX == null || !lightbox.classList.contains('is-open')) return;
        const dx = (e.changedTouches[0]?.clientX ?? touchX) - touchX;
        touchX = null;
        if (Math.abs(dx) < 48) return;
        if (dx < 0) show(current + 1);
        else show(current - 1);
      },
      { passive: true }
    );

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

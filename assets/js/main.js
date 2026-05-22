/* Navigation */
const sections = document.querySelectorAll('.section, .intro');
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

const SPOTIFY_ICON = `<svg class="music-card__brand" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>`;

const PLAY_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
const PAUSE_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>';

function renderMusic(data) {
  const root = document.getElementById('music-widget');
  const meta = document.getElementById('music-meta');
  if (!root) return;

  const profile = data.profile || 'https://open.spotify.com/user/lkuv124pttnovhci7n5od7cj9';

  if (meta) {
    const link = data.url
      ? `<a href="${escapeHtml(data.url)}" target="_blank" rel="noopener">${escapeHtml(data.title || 'Spotify')}</a>`
      : `<a href="${escapeHtml(profile)}" target="_blank" rel="noopener">@Akhil on Spotify</a>`;
    meta.innerHTML = link;
  }

  const tracks = (data.tracks || []).slice(0, 4);
  if (!tracks.length) {
    root.innerHTML = '<div class="music-card music-card--empty">Run ./scripts/sync_spotify.sh after editing data/music.config.json</div>';
    return;
  }

  const art = data.image || tracks[0]?.image || '';
  const label = `${data.title || 'Music'}${data.subtitle ? ` · ${data.subtitle}` : ''}`;
  const embedUrl = data.embed_url || '';

  const trackRows = tracks
    .map((t, i) => {
      const on = i === 0 ? ' music-card__track--on' : '';
      const e = t.explicit ? '<span class="music-card__e">E</span>' : '';
      const href = t.url ? ` href="${escapeHtml(t.url)}" target="_blank" rel="noopener"` : '';
      return `<a class="music-card__track${on}"${href}>
        <span class="music-card__track-n">${t.number ?? i + 1}</span>
        <span class="music-card__track-t">${e}${escapeHtml(t.name)} · ${escapeHtml(t.artist)}</span>
      </a>`;
    })
    .join('');

  root.innerHTML = `
    <div class="music-card">
      <div class="music-card__top">
        <div class="music-card__art-wrap">
          ${art ? `<img class="music-card__art" src="${escapeHtml(art)}" alt="" loading="lazy" />` : '<div class="music-card__art"></div>'}
          <a href="${escapeHtml(profile)}" target="_blank" rel="noopener" aria-label="Spotify">${SPOTIFY_ICON}</a>
        </div>
        <div class="music-card__tracks">${trackRows}</div>
      </div>
      <div class="music-card__foot">
        <div class="music-card__label">${escapeHtml(label)}</div>
        <div class="music-card__controls">
          <button class="music-card__icon-btn" type="button" aria-label="Previous" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
          </button>
          <div class="music-card__bar" aria-hidden="true"><div class="music-card__bar-fill"></div></div>
          <span class="music-card__time">0:00</span>
          <button class="music-card__icon-btn" type="button" aria-label="Next" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm2-12h2v12H8V6zm5 0h2v12h-2V6z"/></svg>
          </button>
          <a class="music-card__icon-btn" href="${escapeHtml(data.url || profile)}" target="_blank" rel="noopener" aria-label="Open in Spotify">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          </a>
          <button class="music-card__play" type="button" aria-label="Play" data-embed="${escapeHtml(embedUrl)}">${PLAY_SVG}</button>
        </div>
      </div>
    </div>
    <div class="music-embed" id="music-embed"></div>
  `;

  const playBtn = root.querySelector('.music-card__play');
  const embedBox = document.getElementById('music-embed');
  playBtn?.addEventListener('click', () => {
    if (!embedUrl || !embedBox) return;
    const open = embedBox.classList.toggle('is-open');
    if (open && !embedBox.querySelector('iframe')) {
      embedBox.innerHTML = `<iframe src="${escapeHtml(embedUrl)}" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
    }
    playBtn.classList.toggle('is-playing', open);
    playBtn.innerHTML = open ? PAUSE_SVG : PLAY_SVG;
    playBtn.setAttribute('aria-label', open ? 'Hide player' : 'Play');
  });
}

async function loadMusic() {
  try {
    const res = await fetch('data/music.json');
    renderMusic(await res.json());
  } catch {
    const root = document.getElementById('music-widget');
    if (root) root.innerHTML = '<div class="music-card music-card--empty">Could not load music.</div>';
  }
}

async function loadBeli() {
  const list = document.getElementById('beli-list');
  const meta = document.getElementById('beli-meta');
  if (!list) return;

  try {
    const res = await fetch('data/beli.json');
    const data = await res.json();

    if (meta && data.profile) {
      meta.innerHTML = `<a href="${escapeHtml(data.profile)}" target="_blank" rel="noopener">Beli</a>`;
      if (data.updated) meta.innerHTML += ` · ${escapeHtml(data.updated)}`;
    }

    if (!data.spots?.length) {
      list.innerHTML = '<p class="empty-state">Add your top spots in data/beli.json</p>';
      return;
    }

    list.innerHTML = data.spots
      .map(
        (s) => `<div class="beli-row">
          <div>
            <div class="beli-row__name">${escapeHtml(s.name)}</div>
            ${s.city ? `<div class="beli-row__city">${escapeHtml(s.city)}</div>` : ''}
            ${s.note ? `<div class="beli-row__note">${escapeHtml(s.note)}</div>` : ''}
          </div>
          <div class="beli-row__score">${s.score != null ? s.score.toFixed(1) : '—'}</div>
        </div>`
      )
      .join('');
  } catch {
    list.innerHTML = '<p class="empty-state">Could not load Beli data.</p>';
  }
}

loadMusic();
loadBeli();

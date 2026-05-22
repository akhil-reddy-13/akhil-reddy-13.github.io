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

function formatRemaining(progressMs, durationMs) {
  const left = Math.max(0, (durationMs || 0) - (progressMs || 0));
  const s = Math.ceil(left / 1000);
  const m = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, '0');
  return `-${m}:${sec}`;
}

const SPOTIFY_ICON = `<svg class="spotify-player__brand" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>`;

function renderSpotifyPlayer(data) {
  const el = document.getElementById('spotify-player');
  const meta = document.getElementById('spotify-meta');
  if (!el) return;

  const np = data.nowPlaying;
  const profile = data.profile || 'https://open.spotify.com/user/lkuv124pttnovhci7n5od7cj9';

  if (meta) {
    meta.innerHTML = `<a href="${escapeHtml(profile)}" target="_blank" rel="noopener">@Akhil on Spotify</a>`;
    if (data.updated) {
      const when = new Date(data.updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      meta.innerHTML += ` · ${when}`;
    }
  }

  if (!np) {
    el.className = 'spotify-player spotify-player--empty';
    el.innerHTML =
      'Connect Spotify to show what you\'re listening to. Add API secrets to GitHub (see SETUP.md), then run the sync workflow.';
    return;
  }

  const albumTracks = data.albumTracks?.length
    ? data.albumTracks
    : (data.tracks || []).slice(0, 3).map((t, i) => ({ ...t, track_number: i + 1 }));

  const progress = np.duration_ms ? ((np.progress_ms || 0) / np.duration_ms) * 100 : 0;
  const timeLeft = formatRemaining(np.progress_ms, np.duration_ms);
  const playUrl = np.url || profile;
  const art = np.image || '';

  const trackRows = albumTracks
    .map((t) => {
      const active = t.name === np.name && t.artist === np.artist;
      const num = t.track_number != null ? t.track_number : '';
      const explicit = t.explicit ? '<span class="spotify-player__explicit">E</span>' : '';
      const href = t.url ? ` href="${escapeHtml(t.url)}" target="_blank" rel="noopener"` : '';
      return `<a class="spotify-player__track${active ? ' spotify-player__track--active' : ''}"${href}>
        <span class="spotify-player__track-num">${num}</span>
        <span class="spotify-player__track-title">${explicit}${escapeHtml(t.name)} · ${escapeHtml(t.artist)}</span>
      </a>`;
    })
    .join('');

  el.className = 'spotify-player';
  el.innerHTML = `
    <div class="spotify-player__top">
      <div class="spotify-player__art-wrap">
        ${art ? `<img class="spotify-player__art" src="${escapeHtml(art)}" alt="" />` : '<div class="spotify-player__art"></div>'}
        <a href="${escapeHtml(profile)}" target="_blank" rel="noopener" aria-label="Spotify profile">${SPOTIFY_ICON}</a>
      </div>
      <div class="spotify-player__tracks">${trackRows || '<span class="spotify-player__track spotify-player__track--active"><span class="spotify-player__track-title">—</span></span>'}</div>
    </div>
    <div class="spotify-player__bottom">
      <div class="spotify-player__now">
        <a href="${escapeHtml(playUrl)}" target="_blank" rel="noopener">${escapeHtml(np.album || np.name)} · ${escapeHtml(np.artist)}</a>
      </div>
      <div class="spotify-player__controls">
        <button class="spotify-player__ctrl" type="button" aria-label="Previous" disabled>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
        </button>
        <div class="spotify-player__progress" aria-hidden="true">
          <div class="spotify-player__progress-fill" style="width:${progress}%"></div>
        </div>
        <span class="spotify-player__time">${timeLeft}</span>
        <button class="spotify-player__ctrl" type="button" aria-label="Next" disabled>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm2-12h2v12H8V6zm5 0h2v12h-2V6z"/></svg>
        </button>
        <a class="spotify-player__ctrl spotify-player__ctrl--play" href="${escapeHtml(playUrl)}" target="_blank" rel="noopener" aria-label="Open in Spotify">
          ${np.is_playing
            ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>'
            : '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'}
        </a>
      </div>
    </div>
  `;
}

async function loadSpotify() {
  try {
    const res = await fetch('data/spotify.json');
    const data = await res.json();
    renderSpotifyPlayer(data);
  } catch {
    const el = document.getElementById('spotify-player');
    if (el) {
      el.className = 'spotify-player spotify-player--empty';
      el.textContent = 'Could not load music data.';
    }
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

loadSpotify();
loadBeli();

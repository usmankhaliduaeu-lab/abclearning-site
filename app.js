// ═══════════════════════════════════════════════════════════════
// ABCLearning — app.js  (multi-page)
// ═══════════════════════════════════════════════════════════════

// ── State ──────────────────────────────────────────────────────
const state = {
  worksheets:  [],
  activeSkill: 'all',
  activeAge:   'all',
};

// ── Boot ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Mobile nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const links  = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    document.addEventListener('click', e => {
      if (!toggle.contains(e.target) && !links.contains(e.target))
        links.classList.remove('open');
    });
  }

  // Highlight active nav link
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === path) a.classList.add('active');
  });

  // Load worksheet data if any grid exists on this page
  const grid         = document.getElementById('card-grid');
  const featuredGrid = document.getElementById('featured-grid');

  if (grid || featuredGrid) {
    // Resolve data.json path — works from any page at site root
    fetch('data.json')
      .then(r => r.json())
      .then(data => {
        state.worksheets = data.worksheets;

        if (grid) {
          // Pre-filter by skill if the grid has data-skill set (category pages)
          const presetSkill = grid.dataset.skill || 'all';
          state.activeSkill = presetSkill;

          // Sync the active pill to match preset
          if (presetSkill !== 'all') {
            document.querySelectorAll('[data-filter="skill"]').forEach(p => {
              p.classList.toggle('active', p.dataset.value === presetSkill);
            });
          }

          initFilters(grid.dataset.skill);
          render();
        }

        if (featuredGrid) {
          const ids = (featuredGrid.dataset.ids || '').split(',').map(s => s.trim()).filter(Boolean);
          renderFeatured(ids, featuredGrid);
        }
      })
      .catch(() => {
        if (grid) grid.innerHTML = '<p class="no-results">Could not load worksheets. Please refresh.</p>';
      });
  }
});

// ── Filters ────────────────────────────────────────────────────
function initFilters(lockedSkill) {
  document.querySelectorAll('.pill').forEach(btn => {
    // On category pages, skill filter is locked — disable those pills
    if (lockedSkill && btn.dataset.filter === 'skill') {
      btn.style.pointerEvents = 'none';
      btn.style.opacity = btn.dataset.value === lockedSkill ? '1' : '0.4';
      return;
    }

    btn.addEventListener('click', () => {
      btn.closest('.filter-pills')
         .querySelectorAll('.pill')
         .forEach(p => p.classList.remove('active'));
      btn.classList.add('active');

      if (btn.dataset.filter === 'skill') state.activeSkill = btn.dataset.value;
      if (btn.dataset.filter === 'age')   state.activeAge   = btn.dataset.value;

      render();
    });
  });
}

// Age-overlap: pill "5" = ages 5–6 band → matches if ageMin≤6 AND ageMax≥5
function matchesFilters(ws) {
  const skillOk = state.activeSkill === 'all' || ws.skill === state.activeSkill;
  let ageOk = true;
  if (state.activeAge !== 'all') {
    const n = parseInt(state.activeAge, 10);
    ageOk = ws.ageMin <= (n + 1) && ws.ageMax >= n;
  }
  return skillOk && ageOk;
}

// ── Full grid render ────────────────────────────────────────────
const AD_EVERY = 6;

function render() {
  const grid     = document.getElementById('card-grid');
  const noResult = document.getElementById('no-results');
  const count    = document.getElementById('result-count');
  if (!grid) return;

  const filtered = state.worksheets.filter(matchesFilters);

  if (count) {
    count.textContent = filtered.length === state.worksheets.length
      ? `${filtered.length} worksheets`
      : `${filtered.length} of ${state.worksheets.length}`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = '';
    noResult && noResult.classList.remove('hidden');
    return;
  }
  noResult && noResult.classList.add('hidden');

  const parts = [];
  filtered.forEach((ws, i) => {
    parts.push(cardHTML(ws));
    if ((i + 1) % AD_EVERY === 0 && i !== filtered.length - 1)
      parts.push('<div class="ad-zone ad-mid-grid" aria-hidden="true"></div>');
  });

  grid.innerHTML = parts.join('');
}

// ── Featured grid (landing page) ────────────────────────────────
function renderFeatured(ids, container) {
  const toShow = ids.length
    ? state.worksheets.filter(ws => ids.includes(ws.id))
    : state.worksheets.slice(0, 6);

  container.innerHTML = toShow.map(cardHTML).join('');
}

// ── Card HTML ──────────────────────────────────────────────────
function cardHTML(ws) {
  const ageLabel = `Ages ${ws.ageMin}–${ws.ageMax}`;
  const safePdf  = encodeURI(ws.pdf);
  return `
<article class="card">
  <div class="card-thumbnail-wrap">
    <img class="card-thumbnail"
         src="${esc(ws.thumbnail)}"
         alt="Preview of ${esc(ws.title)}"
         loading="lazy"
         onerror="this.src='thumbnails/placeholder.png';this.onerror=null;">
  </div>
  <div class="card-body">
    <div class="card-meta">
      <span class="card-badge badge-${esc(ws.skill)}">${esc(ws.skill)}</span>
      <span class="card-age">${ageLabel}</span>
    </div>
    <h2 class="card-title">${esc(ws.title)}</h2>
    <p  class="card-topic">${esc(ws.topic)}</p>
    <button class="card-print-btn"
            onclick="openPdf('${safePdf}')"
            aria-label="Print ${esc(ws.title)}">
      &#128438; Print / Download
    </button>
  </div>
</article>`;
}

// ── Helpers ────────────────────────────────────────────────────
function openPdf(path) {
  window.open(path, '_blank', 'noopener,noreferrer');
}

function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

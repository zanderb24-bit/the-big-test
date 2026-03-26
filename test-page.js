const CATEGORY_CONTENT = {
  engineering: {
    title: 'Engineering',
    description: 'Projects, systems design, architecture decisions, and practical problem solving.',
    bullets: ['Current builds', 'Technical notes', 'Ideas to prototype'],
    tagLine: 'Focus: reliability • maintainability • iteration'
  },
  rugby: {
    title: 'Rugby',
    description: 'Interactive move-builder for position-by-position planning.',
    bullets: ['Tactics board', 'Player and ball trails', 'Layered move design'],
    tagLine: 'Focus: design • timing • execution'
  },
  'counter-strike-2': {
    title: 'Counter-Strike 2',
    description: 'Map prep, aim routines, utility planning, and competitive match review.',
    bullets: ['Utility lineups', 'Match review notes', 'Practice goals'],
    tagLine: 'Focus: mechanics • teamwork • consistency'
  },
  gardening: {
    title: 'Gardening',
    description: 'Planting plans, routine maintenance, and seasonal care scheduling.',
    bullets: ['Jobs this week', 'Plant health', 'Tools and supplies'],
    tagLine: 'Focus: growth • upkeep • seasonal timing'
  },
  work: {
    title: 'Work',
    description: 'Task planning, daily priorities, and progress follow-through.',
    bullets: ['Priorities', 'Meetings or follow-ups', 'Open tasks'],
    tagLine: 'Focus: execution • communication • planning'
  }
};

const ENGINEERING_TOPICS = {
  vessels: 'Vessels',
  pipelines: 'Pipelines',
  structures: 'Structures',
  'mechanical-systems': 'Mechanical Systems'
};

const RUGBY_MOVES_STORAGE_KEY = 'rugby-preset-moves';
const RUGBY_POSITIONS = [
  { id: '1', label: '1', name: 'Loosehead Prop', startX: 28, startY: 20 },
  { id: '2', label: '2', name: 'Hooker', startX: 35, startY: 24 },
  { id: '3', label: '3', name: 'Tighthead Prop', startX: 42, startY: 20 },
  { id: '4', label: '4', name: 'Lock', startX: 30, startY: 30 },
  { id: '5', label: '5', name: 'Lock', startX: 40, startY: 30 },
  { id: '6', label: '6', name: 'Blindside Flanker', startX: 24, startY: 37 },
  { id: '7', label: '7', name: 'Openside Flanker', startX: 46, startY: 37 },
  { id: '8', label: '8', name: 'Number 8', startX: 35, startY: 40 },
  { id: '9', label: '9', name: 'Scrum Half', startX: 48, startY: 46 },
  { id: '10', label: '10', name: 'Fly Half', startX: 56, startY: 52 },
  { id: '11', label: '11', name: 'Left Wing', startX: 18, startY: 60 },
  { id: '12', label: '12', name: 'Inside Centre', startX: 45, startY: 59 },
  { id: '13', label: '13', name: 'Outside Centre', startX: 54, startY: 61 },
  { id: '14', label: '14', name: 'Right Wing', startX: 82, startY: 60 },
  { id: '15', label: '15', name: 'Fullback', startX: 68, startY: 74 }
];
const RUGBY_BALL = { id: 'ball', label: 'Ball', name: 'Ball', startX: 50, startY: 48 };

let rugbyPanelState = { activeView: 'moves' };
let rugbyWorkspace = null;

function getEngineeringStorageKey(topicKey, field) {
  return `engineering-${topicKey}-${field}`;
}

function sanitizeText(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeUrl(urlInput) {
  const rawValue = String(urlInput ?? '').trim();

  if (!rawValue) {
    return null;
  }

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(rawValue) ? rawValue : `https://${rawValue}`;

  try {
    const normalized = new URL(withProtocol);
    if (normalized.protocol !== 'http:' && normalized.protocol !== 'https:') {
      return null;
    }
    return normalized.toString();
  } catch {
    return null;
  }
}

function getSourceLabel(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.replace(/^www\./, '') || 'Reference';
  } catch {
    return 'Reference';
  }
}

function extractYouTubeVideoId(urlInput) {
  const safeUrl = normalizeUrl(urlInput);
  if (!safeUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(safeUrl);
    const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');

    if (hostname === 'youtu.be') {
      const shortId = parsedUrl.pathname.split('/').filter(Boolean)[0];
      return shortId ? shortId.slice(0, 50) : null;
    }

    if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      if (parsedUrl.pathname === '/watch') {
        const watchId = parsedUrl.searchParams.get('v');
        return watchId ? watchId.slice(0, 50) : null;
      }

      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      if ((pathParts[0] === 'embed' || pathParts[0] === 'shorts') && pathParts[1]) {
        return pathParts[1].slice(0, 50);
      }
    }

    return null;
  } catch {
    return null;
  }
}

function getRugbyMoveMetadata(urlInput) {
  const safeUrl = normalizeUrl(urlInput);
  if (!safeUrl) {
    return null;
  }

  const source = getSourceLabel(safeUrl);
  const youtubeId = extractYouTubeVideoId(safeUrl);
  const thumbnailUrl = youtubeId ? `https://img.youtube.com/vi/${encodeURIComponent(youtubeId)}/hqdefault.jpg` : '';

  return {
    url: safeUrl,
    source,
    thumbnailUrl
  };
}

function getMoveId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `move-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadRugbyMoves() {
  const rawMoves = localStorage.getItem(RUGBY_MOVES_STORAGE_KEY);

  if (!rawMoves) {
    return [];
  }

  try {
    const parsedMoves = JSON.parse(rawMoves);
    if (!Array.isArray(parsedMoves)) {
      return [];
    }

    return parsedMoves
      .map((move) => {
        if (!move || typeof move !== 'object') {
          return null;
        }

        const metadata = getRugbyMoveMetadata(move.url);
        if (!metadata) {
          return null;
        }

        const title = String(move.title ?? '').trim();
        if (!title) {
          return null;
        }

        return {
          id: String(move.id ?? getMoveId()),
          title,
          subtitle: String(move.subtitle ?? '').trim(),
          url: metadata.url,
          source: String(move.source ?? metadata.source).trim() || metadata.source,
          thumbnailUrl: String(move.thumbnailUrl ?? metadata.thumbnailUrl).trim() || metadata.thumbnailUrl
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function saveRugbyMoves(moves) {
  const safeMoves = Array.isArray(moves) ? moves : [];
  localStorage.setItem(RUGBY_MOVES_STORAGE_KEY, JSON.stringify(safeMoves));
}

function getRugbyMovesMarkup() {
  const moves = loadRugbyMoves();

  if (!moves.length) {
    return `
      <div class="rugby-empty-state">
        <p>No preset moves saved yet.</p>
        <p>Add your first move above with a YouTube or reference URL.</p>
      </div>
    `;
  }

  const cards = moves
    .map((move) => {
      const safeThumb = sanitizeText(move.thumbnailUrl);
      const safeTitle = sanitizeText(move.title);
      const safeSubtitle = sanitizeText(move.subtitle);
      const safeUrl = sanitizeText(move.url);
      const safeSource = sanitizeText(move.source || 'Reference');
      const safeId = sanitizeText(move.id);

      const thumbnailMarkup = move.thumbnailUrl
        ? `<img src="${safeThumb}" alt="${safeTitle} video thumbnail" loading="lazy" referrerpolicy="no-referrer" />`
        : `
          <div class="rugby-thumb-fallback" aria-hidden="true">
            <span class="rugby-thumb-chip">Reference</span>
            <span class="rugby-thumb-source">${safeSource}</span>
          </div>
        `;

      return `
        <article class="rugby-move-card">
          <button class="rugby-remove-btn" type="button" data-action="remove-rugby-move" data-move-id="${safeId}" aria-label="Remove ${safeTitle}">Remove</button>
          <a class="rugby-move-open" href="${safeUrl}" target="_blank" rel="noopener noreferrer">
            <div class="rugby-thumb-area">
              ${thumbnailMarkup}
            </div>
            <div class="rugby-card-body">
              <h4>${safeTitle}</h4>
              ${safeSubtitle ? `<p class="rugby-move-subtitle">${safeSubtitle}</p>` : '<p class="rugby-move-subtitle">&nbsp;</p>'}
              <p class="rugby-source">${safeSource}</p>
            </div>
          </a>
        </article>
      `;
    })
    .join('');

  return `<div class="rugby-moves-grid">${cards}</div>`;
}

function getRugbyMovesPanelMarkup() {
  return `
    <div class="rugby-preset-panel">
      <form class="rugby-form" data-rugby-form>
        <div class="rugby-form-grid">
          <label class="engineering-label" for="rugby-move-title">Move title</label>
          <input id="rugby-move-title" type="text" maxlength="120" data-rugby-title placeholder="e.g. Crash Ball to Blindside" required />

          <label class="engineering-label" for="rugby-move-subtitle">Tag / short note (optional)</label>
          <input id="rugby-move-subtitle" type="text" maxlength="120" data-rugby-subtitle placeholder="e.g. Phase play • Forward pod" />

          <label class="engineering-label" for="rugby-move-url">Video/reference URL</label>
          <input id="rugby-move-url" type="url" data-rugby-url placeholder="https://youtube.com/watch?v=..." required />
        </div>

        <div class="rugby-form-actions">
          <button type="submit">Save Move</button>
          <p class="engineering-helper rugby-form-helper">Supports YouTube and any valid http(s) reference link.</p>
        </div>
        <p class="engineering-helper engineering-error" data-rugby-error aria-live="polite"></p>
      </form>

      <section class="rugby-library" data-rugby-library aria-live="polite">
        ${getRugbyMovesMarkup()}
      </section>
    </div>
  `;
}

function getRugbySimulatorPanelMarkup() {
  const selectOptions = [...RUGBY_POSITIONS, RUGBY_BALL]
    .map((item) => `<option value="${item.id}">${item.id === 'ball' ? 'Ball' : `${item.id} • ${item.name}`}</option>`)
    .join('');

  return `
    <section class="rugby-workspace">
      <aside class="rugby-controls">
        <div class="rugby-control-block">
          <label class="engineering-label" for="rugby-item-select">Selected marker</label>
          <select id="rugby-item-select" data-rugby-selector>
            ${selectOptions}
          </select>
        </div>

        <div class="rugby-control-actions">
          <button type="button" data-action="rugby-start-recording">Start Recording</button>
          <button type="button" data-action="rugby-stop-recording">Stop Recording</button>
          <button type="button" data-action="rugby-clear-selected">Clear Selected Trail</button>
          <button type="button" data-action="rugby-clear-all">Clear All Trails</button>
          <button type="button" data-action="rugby-reset-positions">Reset Positions</button>
        </div>

        <div class="rugby-status" aria-live="polite">
          <p><span>Selected:</span> <strong data-rugby-selected-name>9 • Scrum Half</strong></p>
          <p><span>Recording:</span> <strong data-rugby-recording-state>OFF</strong></p>
          <p><span>Tip:</span> click marker to select, then drag on pitch.</p>
        </div>
      </aside>

      <section class="rugby-board-wrap">
        <div class="rugby-pitch" data-rugby-pitch>
          <svg class="rugby-pitch-lines" viewBox="0 0 100 100" aria-hidden="true">
            <rect x="1" y="1" width="98" height="98" />
            <line x1="1" y1="50" x2="99" y2="50" />
            <line x1="1" y1="22" x2="99" y2="22" />
            <line x1="1" y1="78" x2="99" y2="78" />
            <line x1="15" y1="1" x2="15" y2="99" />
            <line x1="85" y1="1" x2="85" y2="99" />
          </svg>
          <svg class="rugby-trails-layer" viewBox="0 0 100 100" data-rugby-trails aria-hidden="true"></svg>
          <div class="rugby-markers-layer" data-rugby-markers></div>
        </div>
      </section>
    </section>
  `;
}

function renderRugbySheet(sheetElement) {
  sheetElement.innerHTML = `
    <p class="sheet-tag">Rugby Workspace • Preset Moves + Simulator</p>
    <h3>Rugby</h3>
    <p class="sheet-description">Keep your preset move library and switch to the Move Simulator board for drag-and-record planning.</p>

    <section class="rugby-parent-area">
      <div class="rugby-child-nav" role="tablist" aria-label="Rugby child views">
        <button type="button" class="rugby-child-tab ${rugbyPanelState.activeView === 'moves' ? 'is-active' : ''}" data-rugby-view-btn="moves" role="tab" aria-selected="${rugbyPanelState.activeView === 'moves'}">Preset Moves</button>
        <button type="button" class="rugby-child-tab ${rugbyPanelState.activeView === 'simulator' ? 'is-active' : ''}" data-rugby-view-btn="simulator" role="tab" aria-selected="${rugbyPanelState.activeView === 'simulator'}">Move Simulator</button>
      </div>

      <div class="rugby-child-panel" data-rugby-child-content></div>
    </section>
  `;

  renderRugbyChildView(sheetElement, rugbyPanelState.activeView);
}

function renderRugbyChildView(sheetElement, nextView) {
  const childContent = sheetElement.querySelector('[data-rugby-child-content]');
  if (!childContent) {
    return;
  }

  rugbyPanelState.activeView = nextView === 'simulator' ? 'simulator' : 'moves';
  const viewButtons = sheetElement.querySelectorAll('[data-rugby-view-btn]');
  viewButtons.forEach((button) => {
    const isActive = button.dataset.rugbyViewBtn === rugbyPanelState.activeView;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });

  if (rugbyPanelState.activeView === 'moves') {
    unmountRugbySimulator();
    childContent.innerHTML = getRugbyMovesPanelMarkup();
    return;
  }

  childContent.innerHTML = getRugbySimulatorPanelMarkup();
  mountRugbySimulator(sheetElement);
}

function createRugbyItems() {
  return [...RUGBY_POSITIONS, RUGBY_BALL].map((item) => ({
    ...item,
    x: item.startX,
    y: item.startY,
    path: [],
    isRecording: false
  }));
}

function ensureRugbyWorkspaceModel() {
  if (rugbyWorkspace) {
    return rugbyWorkspace;
  }

  const items = createRugbyItems();
  rugbyWorkspace = {
    selectedId: '9',
    drag: null,
    items,
    byId: new Map(items.map((item) => [item.id, item])),
    dom: null
  };

  return rugbyWorkspace;
}

function mountRugbySimulator(sheetElement) {
  const workspace = ensureRugbyWorkspaceModel();
  const pitch = sheetElement.querySelector('[data-rugby-pitch]');
  const markersLayer = sheetElement.querySelector('[data-rugby-markers]');
  const trailsLayer = sheetElement.querySelector('[data-rugby-trails]');
  const selector = sheetElement.querySelector('[data-rugby-selector]');
  const selectedName = sheetElement.querySelector('[data-rugby-selected-name]');
  const recordingState = sheetElement.querySelector('[data-rugby-recording-state]');

  if (!pitch || !markersLayer || !trailsLayer || !selector || !selectedName || !recordingState) {
    return;
  }

  const onPointerMove = (event) => {
    if (!workspace.drag || !workspace.dom) {
      return;
    }

    const { id, pointerId, offsetX, offsetY } = workspace.drag;
    if (pointerId !== event.pointerId) {
      return;
    }

    const item = workspace.byId.get(id);
    if (!item) {
      return;
    }

    const pitchRect = workspace.dom.pitch.getBoundingClientRect();
    const nextX = Math.min(99, Math.max(1, ((event.clientX - pitchRect.left - offsetX) / pitchRect.width) * 100));
    const nextY = Math.min(99, Math.max(1, ((event.clientY - pitchRect.top - offsetY) / pitchRect.height) * 100));

    item.x = nextX;
    item.y = nextY;

    if (item.isRecording) {
      const lastPoint = item.path[item.path.length - 1];
      const hasMoved = !lastPoint || Math.hypot(lastPoint.x - nextX, lastPoint.y - nextY) > 0.45;
      if (hasMoved) {
        item.path.push({ x: nextX, y: nextY });
      }
    }

    renderRugbyBoard();
  };

  const onPointerUp = (event) => {
    if (!workspace.drag || !workspace.dom) {
      return;
    }

    if (workspace.drag.pointerId !== event.pointerId) {
      return;
    }

    workspace.drag = null;
    workspace.dom.pitch.classList.remove('is-dragging');
  };

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  workspace.dom = {
    pitch,
    markersLayer,
    trailsLayer,
    selector,
    selectedName,
    recordingState,
    cleanup: () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    }
  };

  renderRugbyBoard();
}

function unmountRugbySimulator() {
  if (!rugbyWorkspace || !rugbyWorkspace.dom) {
    return;
  }

  rugbyWorkspace.dom.cleanup();
  rugbyWorkspace.dom = null;
  rugbyWorkspace.drag = null;
}

function destroyRugbyWorkspace() {
  unmountRugbySimulator();
  rugbyWorkspace = null;
}

function renderRugbyBoard() {
  if (!rugbyWorkspace || !rugbyWorkspace.dom) {
    return;
  }

  const { items, selectedId, byId, dom } = rugbyWorkspace;

  dom.markersLayer.innerHTML = items
    .map((item) => {
      const isSelected = item.id === selectedId;
      const markerClass = ['rugby-marker', item.id === 'ball' ? 'is-ball' : 'is-player', isSelected ? 'is-selected' : '']
        .filter(Boolean)
        .join(' ');
      const markerLabel = item.id === 'ball' ? 'B' : item.label;
      const titleText = `${item.id === 'ball' ? 'Ball' : `${item.id} • ${item.name}`}${item.isRecording ? ' (Recording)' : ''}`;

      return `
        <button
          type="button"
          class="${markerClass}"
          style="left:${item.x}%; top:${item.y}%;"
          data-rugby-marker="${item.id}"
          title="${sanitizeText(titleText)}"
          aria-label="${sanitizeText(titleText)}">
          ${sanitizeText(markerLabel)}
        </button>
      `;
    })
    .join('');

  dom.trailsLayer.innerHTML = items
    .map((item) => {
      if (!item.path.length) {
        return '';
      }

      const points = item.path.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
      return `<polyline class="rugby-trail ${item.id === selectedId ? 'is-selected' : ''}" data-trail-id="${item.id}" points="${points}" />`;
    })
    .join('');

  const selectedItem = byId.get(selectedId);
  dom.selector.value = selectedId;
  dom.selectedName.textContent = selectedItem ? `${selectedItem.id === 'ball' ? 'Ball' : `${selectedItem.id} • ${selectedItem.name}`}` : '—';
  dom.recordingState.textContent = selectedItem?.isRecording ? 'ON' : 'OFF';
  dom.recordingState.classList.toggle('is-on', Boolean(selectedItem?.isRecording));
}

function clearRugbyError(sheetElement) {
  const errorElement = sheetElement.querySelector('[data-rugby-error]');
  if (errorElement) {
    errorElement.textContent = '';
  }
}

function showRugbyError(sheetElement, message) {
  const errorElement = sheetElement.querySelector('[data-rugby-error]');
  if (errorElement) {
    errorElement.textContent = message;
  }
}

function refreshRugbyMoves(sheetElement) {
  const libraryElement = sheetElement.querySelector('[data-rugby-library]');
  if (!libraryElement) {
    return;
  }

  libraryElement.innerHTML = getRugbyMovesMarkup();
}

function loadTopicNotes(topicKey) {
  const storedNotes = localStorage.getItem(getEngineeringStorageKey(topicKey, 'notes'));
  return typeof storedNotes === 'string' ? storedNotes : '';
}

function saveTopicNotes(topicKey, notes) {
  localStorage.setItem(getEngineeringStorageKey(topicKey, 'notes'), String(notes ?? ''));
}

function loadTopicLinks(topicKey) {
  const rawLinks = localStorage.getItem(getEngineeringStorageKey(topicKey, 'links'));

  if (!rawLinks) {
    return [];
  }

  try {
    const parsedLinks = JSON.parse(rawLinks);
    if (!Array.isArray(parsedLinks)) {
      return [];
    }

    return parsedLinks.filter((item) => {
      if (!item || typeof item !== 'object') {
        return false;
      }

      const safeUrl = normalizeUrl(item.url);
      return Boolean(safeUrl);
    });
  } catch {
    return [];
  }
}

function saveTopicLinks(topicKey, links) {
  const safeLinks = Array.isArray(links) ? links : [];
  localStorage.setItem(getEngineeringStorageKey(topicKey, 'links'), JSON.stringify(safeLinks));
}

function getTopicLinksMarkup(topicKey) {
  const links = loadTopicLinks(topicKey);

  if (!links.length) {
    return '<li class="engineering-empty-state">No links saved yet. Add a reference URL above.</li>';
  }

  return links
    .map((link, index) => {
      const linkUrl = normalizeUrl(link.url);
      if (!linkUrl) {
        return '';
      }

      const linkLabel = String(link.label ?? '').trim() || linkUrl;

      return `
        <li class="engineering-link-item">
          <a href="${sanitizeText(linkUrl)}" target="_blank" rel="noopener noreferrer">${sanitizeText(linkLabel)}</a>
          <button class="link-remove-btn" type="button" data-action="remove-link" data-topic="${topicKey}" data-index="${index}">Remove</button>
        </li>
      `;
    })
    .join('');
}

function getEngineeringTopicMarkup(topicKey, topicTitle) {
  const notesValue = sanitizeText(loadTopicNotes(topicKey));

  return `
    <section class="engineering-topic-card" data-topic-card="${topicKey}">
      <h4>${topicTitle}</h4>

      <label class="engineering-label" for="notes-${topicKey}">Notes</label>
      <textarea id="notes-${topicKey}" class="engineering-notes" data-topic-notes="${topicKey}" placeholder="Add project notes, assumptions, and next steps...">${notesValue}</textarea>
      <p class="engineering-helper" id="status-${topicKey}">Notes auto-save while you type.</p>

      <div class="engineering-links-block">
        <p class="engineering-label">Reference Links</p>
        <div class="engineering-link-inputs">
          <input class="engineering-link-label" type="text" data-topic-link-label="${topicKey}" placeholder="Link label (optional)" />
          <input class="engineering-link-url" type="url" data-topic-link-url="${topicKey}" placeholder="https://example.com/spec" />
          <button type="button" data-action="add-link" data-topic="${topicKey}">Add Link</button>
        </div>
        <p class="engineering-helper engineering-error" data-topic-error="${topicKey}" aria-live="polite"></p>
        <ul class="engineering-link-list" data-topic-links="${topicKey}">
          ${getTopicLinksMarkup(topicKey)}
        </ul>
      </div>
    </section>
  `;
}

function renderEngineeringSheet(sheetElement) {
  const topicCards = Object.entries(ENGINEERING_TOPICS)
    .map(([topicKey, topicTitle]) => getEngineeringTopicMarkup(topicKey, topicTitle))
    .join('');

  sheetElement.innerHTML = `
    <p class="sheet-tag">Engineering Workspace • Saved locally in this browser</p>
    <h3>Engineering</h3>
    <p class="sheet-description">Capture technical notes and maintain reference links by engineering discipline.</p>
    <div class="engineering-topics-grid">
      ${topicCards}
    </div>
  `;
}

function renderBasicCategorySheet(sheetElement, content) {
  const bulletsMarkup = content.bullets.map((bullet) => `<li>${bullet}</li>`).join('');

  sheetElement.innerHTML = `
    <p class="sheet-tag">${content.tagLine}</p>
    <h3>${content.title}</h3>
    <p class="sheet-description">${content.description}</p>
    <ul class="sheet-list">${bulletsMarkup}</ul>
  `;
}

function renderCategorySheet(sheetElement, categoryKey) {
  if (!sheetElement) {
    return;
  }

  const content = CATEGORY_CONTENT[categoryKey];

  if (!content) {
    destroyRugbyWorkspace();
    sheetElement.innerHTML = '<p class="sheet-placeholder">Choose a category above to view details.</p>';
    return;
  }

  if (categoryKey === 'engineering') {
    unmountRugbySimulator();
    renderEngineeringSheet(sheetElement);
    return;
  }

  if (categoryKey === 'rugby') {
    renderRugbySheet(sheetElement);
    return;
  }

  unmountRugbySimulator();
  renderBasicCategorySheet(sheetElement, content);
}

function refreshTopicLinks(sheetElement, topicKey) {
  const linksContainer = sheetElement.querySelector(`[data-topic-links="${topicKey}"]`);
  if (!linksContainer) {
    return;
  }

  linksContainer.innerHTML = getTopicLinksMarkup(topicKey);
}

function clearTopicError(sheetElement, topicKey) {
  const errorElement = sheetElement.querySelector(`[data-topic-error="${topicKey}"]`);
  if (errorElement) {
    errorElement.textContent = '';
  }
}

function showTopicError(sheetElement, topicKey, message) {
  const errorElement = sheetElement.querySelector(`[data-topic-error="${topicKey}"]`);
  if (errorElement) {
    errorElement.textContent = message;
  }
}

function handleEngineeringInput(event, sheetElement) {
  const notesField = event.target.closest('[data-topic-notes]');
  if (!notesField) {
    return;
  }

  const topicKey = notesField.dataset.topicNotes;
  if (!topicKey || !ENGINEERING_TOPICS[topicKey]) {
    return;
  }

  saveTopicNotes(topicKey, notesField.value);

  const statusText = sheetElement.querySelector(`#status-${topicKey}`);
  if (statusText) {
    statusText.textContent = 'Notes saved.';
  }
}

function handleRugbyInput(event, sheetElement) {
  const selector = event.target.closest('[data-rugby-selector]');
  if (!selector || !rugbyWorkspace?.dom || rugbyPanelState.activeView !== 'simulator') {
    return;
  }

  const selectedId = String(selector.value ?? '').trim();
  if (!rugbyWorkspace.byId.has(selectedId)) {
    return;
  }

  rugbyWorkspace.selectedId = selectedId;
  renderRugbyBoard();
}

function handleEngineeringClick(event, sheetElement) {
  const actionButton = event.target.closest('[data-action]');
  if (!actionButton) {
    return;
  }

  const topicKey = actionButton.dataset.topic;
  if (!topicKey || !ENGINEERING_TOPICS[topicKey]) {
    return;
  }

  if (actionButton.dataset.action === 'add-link') {
    const labelInput = sheetElement.querySelector(`[data-topic-link-label="${topicKey}"]`);
    const urlInput = sheetElement.querySelector(`[data-topic-link-url="${topicKey}"]`);

    if (!urlInput) {
      return;
    }

    const safeUrl = normalizeUrl(urlInput.value);
    if (!safeUrl) {
      showTopicError(sheetElement, topicKey, 'Please enter a valid http(s) URL.');
      return;
    }

    const nextLink = {
      label: String(labelInput?.value ?? '').trim(),
      url: safeUrl
    };

    const topicLinks = loadTopicLinks(topicKey);
    topicLinks.push(nextLink);
    saveTopicLinks(topicKey, topicLinks);

    if (labelInput) {
      labelInput.value = '';
    }
    urlInput.value = '';
    clearTopicError(sheetElement, topicKey);
    refreshTopicLinks(sheetElement, topicKey);
  }

  if (actionButton.dataset.action === 'remove-link') {
    const linkIndex = Number.parseInt(actionButton.dataset.index ?? '', 10);
    if (Number.isNaN(linkIndex) || linkIndex < 0) {
      return;
    }

    const topicLinks = loadTopicLinks(topicKey);
    const filteredLinks = topicLinks.filter((_, index) => index !== linkIndex);
    saveTopicLinks(topicKey, filteredLinks);
    clearTopicError(sheetElement, topicKey);
    refreshTopicLinks(sheetElement, topicKey);
  }
}

function handleRugbyPointerDown(event, sheetElement) {
  if (rugbyPanelState.activeView !== 'simulator' || !rugbyWorkspace?.dom || !sheetElement.contains(rugbyWorkspace.dom.pitch)) {
    return;
  }

  const markerButton = event.target.closest('[data-rugby-marker]');
  if (!markerButton) {
    return;
  }

  const markerId = String(markerButton.dataset.rugbyMarker ?? '').trim();
  if (!rugbyWorkspace.byId.has(markerId)) {
    return;
  }

  event.preventDefault();
  rugbyWorkspace.selectedId = markerId;

  const markerRect = markerButton.getBoundingClientRect();
  rugbyWorkspace.drag = {
    id: markerId,
    pointerId: event.pointerId,
    offsetX: markerRect.left + markerRect.width / 2 - event.clientX,
    offsetY: markerRect.top + markerRect.height / 2 - event.clientY
  };

  const markerItem = rugbyWorkspace.byId.get(markerId);
  if (markerItem?.isRecording && !markerItem.path.length) {
    markerItem.path.push({ x: markerItem.x, y: markerItem.y });
  }

  rugbyWorkspace.dom.pitch.classList.add('is-dragging');
  renderRugbyBoard();
}

function handleRugbySubmit(event, sheetElement) {
  const rugbyForm = event.target.closest('[data-rugby-form]');
  if (!rugbyForm) {
    return;
  }

  event.preventDefault();

  const titleInput = rugbyForm.querySelector('[data-rugby-title]');
  const subtitleInput = rugbyForm.querySelector('[data-rugby-subtitle]');
  const urlInput = rugbyForm.querySelector('[data-rugby-url]');

  const title = String(titleInput?.value ?? '').trim();
  const subtitle = String(subtitleInput?.value ?? '').trim();
  const urlValue = String(urlInput?.value ?? '').trim();

  if (!title) {
    showRugbyError(sheetElement, 'Please add a move title.');
    return;
  }

  const metadata = getRugbyMoveMetadata(urlValue);
  if (!metadata) {
    showRugbyError(sheetElement, 'Please enter a valid http(s) URL.');
    return;
  }

  const moves = loadRugbyMoves();
  moves.unshift({
    id: getMoveId(),
    title,
    subtitle,
    url: metadata.url,
    source: metadata.source,
    thumbnailUrl: metadata.thumbnailUrl
  });

  saveRugbyMoves(moves);
  clearRugbyError(sheetElement);
  rugbyForm.reset();
  refreshRugbyMoves(sheetElement);
}

function handleRugbyClick(event, sheetElement) {
  const viewButton = event.target.closest('[data-rugby-view-btn]');
  if (viewButton && sheetElement.contains(viewButton)) {
    renderRugbyChildView(sheetElement, viewButton.dataset.rugbyViewBtn);
    return;
  }

  const removeButton = event.target.closest('[data-action="remove-rugby-move"]');
  if (removeButton) {
    event.preventDefault();
    const moveId = String(removeButton.dataset.moveId ?? '').trim();
    if (!moveId) {
      return;
    }

    const moves = loadRugbyMoves();
    const filteredMoves = moves.filter((move) => move.id !== moveId);
    saveRugbyMoves(filteredMoves);
    clearRugbyError(sheetElement);
    refreshRugbyMoves(sheetElement);
    return;
  }

  if (rugbyPanelState.activeView !== 'simulator' || !rugbyWorkspace?.dom || !sheetElement.contains(rugbyWorkspace.dom.pitch)) {
    return;
  }

  const actionButton = event.target.closest('[data-action]');
  if (!actionButton) {
    return;
  }

  const selectedItem = rugbyWorkspace.byId.get(rugbyWorkspace.selectedId);
  if (!selectedItem) {
    return;
  }

  if (actionButton.dataset.action === 'rugby-start-recording') {
    selectedItem.isRecording = true;
    if (!selectedItem.path.length) {
      selectedItem.path.push({ x: selectedItem.x, y: selectedItem.y });
    }
  }

  if (actionButton.dataset.action === 'rugby-stop-recording') {
    selectedItem.isRecording = false;
  }

  if (actionButton.dataset.action === 'rugby-clear-selected') {
    selectedItem.path = [];
  }

  if (actionButton.dataset.action === 'rugby-clear-all') {
    rugbyWorkspace.items.forEach((item) => {
      item.path = [];
    });
  }

  if (actionButton.dataset.action === 'rugby-reset-positions') {
    rugbyWorkspace.items.forEach((item) => {
      item.x = item.startX;
      item.y = item.startY;
      item.isRecording = false;
    });
    rugbyWorkspace.drag = null;
    rugbyWorkspace.dom.pitch.classList.remove('is-dragging');
  }

  renderRugbyBoard();
}

function setActiveCategory(buttons, sheetElement, categoryKey) {
  let hasMatch = false;

  buttons.forEach((button) => {
    const isActive = button.dataset.category === categoryKey;
    button.classList.toggle('selected', isActive);
    button.setAttribute('aria-pressed', String(isActive));

    if (isActive) {
      hasMatch = true;
    }
  });

  renderCategorySheet(sheetElement, hasMatch ? categoryKey : null);
}

function initCategoryExplorer() {
  const categoryButtons = Array.from(document.querySelectorAll('[data-category]'));
  const sheetElement = document.getElementById('category-sheet');

  if (!categoryButtons.length || !sheetElement) {
    return;
  }

  categoryButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setActiveCategory(categoryButtons, sheetElement, button.dataset.category);
    });
  });

  sheetElement.addEventListener('input', (event) => {
    handleEngineeringInput(event, sheetElement);
    handleRugbyInput(event, sheetElement);
  });

  sheetElement.addEventListener('pointerdown', (event) => {
    handleRugbyPointerDown(event, sheetElement);
  });

  sheetElement.addEventListener('click', (event) => {
    handleEngineeringClick(event, sheetElement);
    handleRugbyClick(event, sheetElement);
  });

  sheetElement.addEventListener('submit', (event) => {
    handleRugbySubmit(event, sheetElement);
  });

  setActiveCategory(categoryButtons, sheetElement, categoryButtons[0].dataset.category);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCategoryExplorer, { once: true });
} else {
  initCategoryExplorer();
}

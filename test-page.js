const CATEGORY_CONTENT = {
  engineering: {
    title: 'Engineering',
    description: 'Projects, systems design, architecture decisions, and practical problem solving.',
    bullets: ['Current builds', 'Technical notes', 'Ideas to prototype'],
    tagLine: 'Focus: reliability • maintainability • iteration'
  },
  rugby: {
    title: 'Rugby',
    description: 'Preset move library and simulator board for position-by-position planning.',
    bullets: ['Preset moves', 'Video thumbnails', 'Player and ball trails'],
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
const RUGBY_PRESET_STORAGE_KEY = 'rugby-preset-moves';
const RUGBY_PRESET_STORAGE_LEGACY_KEY = 'rugby-preset-moves-v1';
const RUGBY_SIMULATOR_RECORDINGS_KEY = 'rugby-simulator-recordings';

const rugbyPanelState = { activeView: 'moves', pendingRecordingId: null };
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
      return parsedUrl.pathname.split('/').filter(Boolean)[0] ?? null;
    }

    if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      if (parsedUrl.pathname === '/watch') {
        return parsedUrl.searchParams.get('v');
      }

      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      if ((pathParts[0] === 'embed' || pathParts[0] === 'shorts') && pathParts[1]) {
        return pathParts[1];
      }
    }

    return null;
  } catch {
    return null;
  }
}

function loadRugbyMoves() {
  const rawMoves = localStorage.getItem(RUGBY_PRESET_STORAGE_KEY) || localStorage.getItem(RUGBY_PRESET_STORAGE_LEGACY_KEY);
  if (!rawMoves) return [];

  try {
    const parsed = JSON.parse(rawMoves);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((move) => move && typeof move === 'object' && String(move.id ?? '').trim() && String(move.title ?? '').trim())
      .map((move) => ({
        ...move,
        type: move.type === 'simulator-move' ? 'simulator-move' : 'external-link',
        sourceLabel: String(move.sourceLabel ?? '').trim() || (move.type === 'simulator-move' ? 'Simulator' : '')
      }));
  } catch {
    return [];
  }
}

function saveRugbyMoves(moves) {
  const safeMoves = Array.isArray(moves) ? moves : [];
  localStorage.setItem(RUGBY_PRESET_STORAGE_KEY, JSON.stringify(safeMoves));
}

function loadRugbySimulatorRecordings() {
  const rawRecordings = localStorage.getItem(RUGBY_SIMULATOR_RECORDINGS_KEY);
  if (!rawRecordings) return [];

  try {
    const parsed = JSON.parse(rawRecordings);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((recording) => recording && typeof recording === 'object' && String(recording.id ?? '').trim() && String(recording.title ?? '').trim());
  } catch {
    return [];
  }
}

function saveRugbySimulatorRecordings(recordings) {
  const safeRecordings = Array.isArray(recordings) ? recordings : [];
  localStorage.setItem(RUGBY_SIMULATOR_RECORDINGS_KEY, JSON.stringify(safeRecordings));
}

function getRugbyRecordingOptionsMarkup(selectedId = '') {
  const recordings = loadRugbySimulatorRecordings();
  if (!recordings.length) {
    return '<option value="">No recordings saved yet</option>';
  }

  return recordings
    .map((recording) => {
      const isSelected = recording.id === selectedId ? ' selected' : '';
      return `<option value="${sanitizeText(recording.id)}"${isSelected}>${sanitizeText(recording.title)}</option>`;
    })
    .join('');
}

function getRugbyMovesMarkup() {
  const moves = loadRugbyMoves();
  if (!moves.length) {
    return '<li class="engineering-empty-state">No preset moves yet. Save one from the form above.</li>';
  }

  return moves
    .map((move) => {
      const isSimulatorMove = move.type === 'simulator-move';
      const safeUrl = normalizeUrl(move.videoUrl);
      const sourceLabel = isSimulatorMove ? (move.sourceLabel || 'Simulator') : safeUrl ? getSourceLabel(safeUrl) : 'Manual';
      const thumbnailUrl = move.thumbnailUrl || '';
      const safeTitle = sanitizeText(move.title);
      const safeDescription = sanitizeText(move.description || 'No notes added.');

      return `
        <li class="rugby-move-card">
          <div class="rugby-move-thumb-wrap">
            ${thumbnailUrl
              ? `<img class="rugby-move-thumb" src="${sanitizeText(thumbnailUrl)}" alt="${safeTitle} thumbnail" loading="lazy" />`
              : '<div class="rugby-move-thumb rugby-move-thumb-fallback" aria-hidden="true">No Preview</div>'}
          </div>
          <div class="rugby-move-meta">
            <h5>${safeTitle} ${isSimulatorMove ? '<span class="rugby-move-badge">Simulator</span>' : ''}</h5>
            <p>${safeDescription}</p>
            <div class="rugby-move-meta-footer">
              <span>${sanitizeText(sourceLabel)}</span>
              ${
                isSimulatorMove
                  ? `<button type="button" data-action="rugby-open-simulator-move" data-recording-id="${sanitizeText(move.recordingId || '')}">Open in Simulator</button>`
                  : safeUrl
                    ? `<a href="${sanitizeText(safeUrl)}" target="_blank" rel="noopener noreferrer">Open Video</a>`
                    : '<span>No URL</span>'
              }
            </div>
          </div>
          <button type="button" class="link-remove-btn" data-action="rugby-delete-move" data-rugby-move-id="${sanitizeText(move.id)}">Remove</button>
        </li>
      `;
    })
    .join('');
}

function getRugbyMovesPanelMarkup() {
  return `
    <section class="rugby-moves-panel" aria-label="Rugby preset moves">
      <div class="engineering-topic-card rugby-move-form-card">
        <h4>Preset Moves Library</h4>
        <label class="engineering-label" for="rugby-move-title">Move Name</label>
        <input id="rugby-move-title" type="text" class="engineering-link-label" data-rugby-move-title placeholder="e.g. Strike Left - Phase 2" />

        <label class="engineering-label" for="rugby-move-video">Video URL</label>
        <input id="rugby-move-video" type="url" class="engineering-link-url" data-rugby-move-video placeholder="https://youtube.com/watch?v=..." />

        <label class="engineering-label" for="rugby-move-notes">Notes</label>
        <textarea id="rugby-move-notes" class="engineering-notes" data-rugby-move-notes placeholder="Optional quick notes about timing and support lines."></textarea>

        <button type="button" data-action="rugby-save-move">Save Preset Move</button>
        <p class="engineering-helper engineering-error" data-rugby-error aria-live="polite"></p>
      </div>

      <section class="engineering-topic-card rugby-library-card">
        <h4>Saved Preset Moves</h4>
        <ul class="rugby-move-list" data-rugby-library>
          ${getRugbyMovesMarkup()}
        </ul>
      </section>
    </section>
  `;
}

function getRugbySimulatorPanelMarkup() {
  const workspace = ensureRugbyWorkspaceModel();
  const selectOptions = [...RUGBY_POSITIONS, RUGBY_BALL]
    .map((item) => `<option value="${item.id}">${item.id === 'ball' ? 'Ball' : `${item.id} • ${item.name}`}</option>`)
    .join('');

  return `
    <section class="rugby-workspace">
      <aside class="rugby-controls">
        <div class="rugby-control-block">
          <label class="engineering-label" for="rugby-recording-title">Move title</label>
          <input id="rugby-recording-title" type="text" class="engineering-link-label" data-rugby-recording-title placeholder="e.g. Strike Left - Wrap Around" value="${sanitizeText(workspace.recordingMeta.title)}" />
        </div>

        <div class="rugby-control-block">
          <label class="engineering-label" for="rugby-recording-subtitle">Description / tag (optional)</label>
          <input id="rugby-recording-subtitle" type="text" class="engineering-link-label" data-rugby-recording-subtitle placeholder="e.g. Lineout launch • Attack" value="${sanitizeText(workspace.recordingMeta.subtitle)}" />
        </div>

        <div class="rugby-control-block">
          <label class="engineering-label" for="rugby-item-select">Selected marker</label>
          <select id="rugby-item-select" data-rugby-selector>
            ${selectOptions}
          </select>
        </div>

        <div class="rugby-control-block">
          <label class="engineering-label" for="rugby-saved-recordings">Saved recordings</label>
          <select id="rugby-saved-recordings" data-rugby-recording-select>
            ${getRugbyRecordingOptionsMarkup(workspace.loadedRecordingId)}
          </select>
        </div>

        <div class="rugby-control-actions">
          <button type="button" data-action="rugby-start-recording">Start Recording</button>
          <button type="button" data-action="rugby-stop-recording">Stop Recording</button>
          <button type="button" data-action="rugby-clear-selected">Clear Selected Trail</button>
          <button type="button" data-action="rugby-clear-all">Clear All Trails</button>
          <button type="button" data-action="rugby-reset-positions">Reset Positions</button>
          <button type="button" data-action="rugby-save-recording">Save Recording</button>
          <button type="button" data-action="rugby-load-recording">Load Recording</button>
          <button type="button" data-action="rugby-play-recording">Play</button>
          <button type="button" data-action="rugby-pause-recording">Pause / Stop</button>
          <button type="button" data-action="rugby-reset-playback">Reset Playback</button>
          <button type="button" data-action="rugby-publish-recording">Save to Preset Moves</button>
        </div>

        <div class="rugby-status" aria-live="polite">
          <p><span>Selected:</span> <strong data-rugby-selected-name>9 • Scrum Half</strong></p>
          <p><span>Recording:</span> <strong data-rugby-recording-state>OFF</strong></p>
          <p><span>Playback:</span> <strong data-rugby-playback-state>IDLE</strong></p>
          <p><span>View:</span> <strong>Move Simulator</strong></p>
          <p><span>Tip:</span> Select marker, click start recording, then drag on pitch.</p>
          <p class="engineering-helper" data-rugby-simulator-message aria-live="polite"></p>
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
    <p class="sheet-description">Use Preset Moves for saved clips and notes, or switch to Move Simulator for interactive trail building.</p>

    <section class="rugby-parent-area">
      <div class="rugby-child-nav" role="tablist" aria-label="Rugby child views">
        <button type="button" class="rugby-child-tab ${rugbyPanelState.activeView === 'moves' ? 'is-active' : ''}" data-action="rugby-switch-view" data-rugby-view="moves" role="tab" aria-selected="${rugbyPanelState.activeView === 'moves'}">Preset Moves</button>
        <button type="button" class="rugby-child-tab ${rugbyPanelState.activeView === 'simulator' ? 'is-active' : ''}" data-action="rugby-switch-view" data-rugby-view="simulator" role="tab" aria-selected="${rugbyPanelState.activeView === 'simulator'}">Move Simulator</button>
      </div>

      <div class="rugby-child-content" data-rugby-child-content></div>
    </section>
  `;

  renderRugbyChildView(sheetElement, rugbyPanelState.activeView);
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
    dom: null,
    loadedRecordingId: '',
    recordingMeta: { title: '', subtitle: '' },
    playback: {
      state: 'idle',
      rafId: null,
      duration: 0,
      elapsed: 0,
      startedAt: 0,
      recording: null
    }
  };

  return rugbyWorkspace;
}

function createRugbyRecordingFromWorkspace(workspace, title, subtitle) {
  const playerStarts = RUGBY_POSITIONS.map((position) => {
    const item = workspace.byId.get(position.id);
    return {
      id: position.id,
      name: position.name,
      startX: item?.startX ?? position.startX,
      startY: item?.startY ?? position.startY
    };
  });

  const ballItem = workspace.byId.get('ball');
  const paths = {};
  workspace.items.forEach((item) => {
    paths[item.id] = item.path.map((point) => ({ x: Number(point.x), y: Number(point.y) }));
  });

  const duration = Math.max(
    2200,
    ...Object.values(paths).map((path) => (Array.isArray(path) ? Math.max(0, path.length - 1) * 280 : 0))
  );

  return {
    id: `sim-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    subtitle,
    createdAt: new Date().toISOString(),
    players: playerStarts,
    ball: {
      id: 'ball',
      name: 'Ball',
      startX: ballItem?.startX ?? RUGBY_BALL.startX,
      startY: ballItem?.startY ?? RUGBY_BALL.startY
    },
    paths,
    duration
  };
}

function setRugbySimulatorMessage(message) {
  if (!rugbyWorkspace?.dom?.simulatorMessage) return;
  rugbyWorkspace.dom.simulatorMessage.textContent = message || '';
}

function applyRecordingToWorkspace(recording) {
  if (!rugbyWorkspace || !recording) return;

  rugbyWorkspace.items.forEach((item) => {
    const startSource =
      item.id === 'ball'
        ? recording.ball
        : Array.isArray(recording.players)
          ? recording.players.find((player) => player.id === item.id)
          : null;

    item.startX = Number(startSource?.startX ?? item.startX);
    item.startY = Number(startSource?.startY ?? item.startY);

    const savedPath = Array.isArray(recording.paths?.[item.id]) ? recording.paths[item.id] : [];
    item.path = savedPath.map((point) => ({ x: Number(point.x), y: Number(point.y) }));
    const firstPoint = item.path[0];
    item.x = Number(firstPoint?.x ?? item.startX);
    item.y = Number(firstPoint?.y ?? item.startY);
    item.isRecording = false;
  });
}

function getPointAtProgress(path, progress) {
  if (!Array.isArray(path) || !path.length) return null;
  if (path.length === 1) return path[0];

  const bounded = Math.min(1, Math.max(0, progress));
  const scaled = bounded * (path.length - 1);
  const index = Math.floor(scaled);
  const nextIndex = Math.min(path.length - 1, index + 1);
  const localProgress = scaled - index;
  const from = path[index];
  const to = path[nextIndex];

  return {
    x: from.x + (to.x - from.x) * localProgress,
    y: from.y + (to.y - from.y) * localProgress
  };
}

function stopRugbyPlayback({ resetToStart = false } = {}) {
  if (!rugbyWorkspace) return;

  const { playback } = rugbyWorkspace;
  if (playback.rafId) {
    cancelAnimationFrame(playback.rafId);
    playback.rafId = null;
  }

  playback.state = 'paused';

  if (resetToStart && playback.recording) {
    applyRecordingToWorkspace(playback.recording);
    playback.elapsed = 0;
  }
}

function startRugbyPlayback() {
  if (!rugbyWorkspace) return;
  const { playback } = rugbyWorkspace;
  const recording = playback.recording;
  if (!recording) return;

  playback.duration = Math.max(1000, Number(recording.duration || 2500));
  playback.startedAt = performance.now() - playback.elapsed;
  playback.state = 'playing';

  const animate = (timestamp) => {
    if (!rugbyWorkspace || rugbyWorkspace.playback.state !== 'playing') return;
    playback.elapsed = Math.max(0, timestamp - playback.startedAt);
    const progress = Math.min(1, playback.elapsed / playback.duration);

    rugbyWorkspace.items.forEach((item) => {
      const path = Array.isArray(recording.paths?.[item.id]) ? recording.paths[item.id] : [];
      const point = getPointAtProgress(path, progress);
      if (point) {
        item.x = point.x;
        item.y = point.y;
      }
    });

    renderRugbyBoard();

    if (progress >= 1) {
      playback.state = 'paused';
      playback.rafId = null;
      return;
    }

    playback.rafId = requestAnimationFrame(animate);
  };

  if (playback.rafId) cancelAnimationFrame(playback.rafId);
  playback.rafId = requestAnimationFrame(animate);
}

function mountRugbySimulator(sheetElement) {
  const workspace = ensureRugbyWorkspaceModel();
  const pitch = sheetElement.querySelector('[data-rugby-pitch]');
  const markersLayer = sheetElement.querySelector('[data-rugby-markers]');
  const trailsLayer = sheetElement.querySelector('[data-rugby-trails]');
  const selector = sheetElement.querySelector('[data-rugby-selector]');
  const recordingTitle = sheetElement.querySelector('[data-rugby-recording-title]');
  const recordingSubtitle = sheetElement.querySelector('[data-rugby-recording-subtitle]');
  const recordingSelect = sheetElement.querySelector('[data-rugby-recording-select]');
  const selectedName = sheetElement.querySelector('[data-rugby-selected-name]');
  const recordingState = sheetElement.querySelector('[data-rugby-recording-state]');
  const playbackState = sheetElement.querySelector('[data-rugby-playback-state]');
  const simulatorMessage = sheetElement.querySelector('[data-rugby-simulator-message]');

  if (!pitch || !markersLayer || !trailsLayer || !selector || !selectedName || !recordingState || !playbackState) {
    return;
  }

  const onPointerMove = (event) => {
    if (!workspace.drag || !workspace.dom || workspace.drag.pointerId !== event.pointerId) {
      return;
    }

    const item = workspace.byId.get(workspace.drag.id);
    if (!item) {
      return;
    }

    const pitchRect = workspace.dom.pitch.getBoundingClientRect();
    const nextX = Math.min(99, Math.max(1, ((event.clientX - pitchRect.left - workspace.drag.offsetX) / pitchRect.width) * 100));
    const nextY = Math.min(99, Math.max(1, ((event.clientY - pitchRect.top - workspace.drag.offsetY) / pitchRect.height) * 100));

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
    if (!workspace.drag || !workspace.dom || workspace.drag.pointerId !== event.pointerId) {
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
    recordingTitle,
    recordingSubtitle,
    recordingSelect,
    selectedName,
    recordingState,
    playbackState,
    simulatorMessage,
    cleanup: () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    }
  };

  if (rugbyPanelState.pendingRecordingId) {
    const selectedRecording = loadRugbySimulatorRecordings().find((recording) => recording.id === rugbyPanelState.pendingRecordingId);
    if (selectedRecording) {
      workspace.loadedRecordingId = selectedRecording.id;
      workspace.recordingMeta = { title: selectedRecording.title, subtitle: selectedRecording.subtitle || '' };
      workspace.playback.recording = selectedRecording;
      workspace.playback.elapsed = 0;
      applyRecordingToWorkspace(selectedRecording);
      setRugbySimulatorMessage(`Loaded "${selectedRecording.title}" from Preset Moves.`);
    }
    rugbyPanelState.pendingRecordingId = null;
  }

  renderRugbyBoard();
}

function unmountRugbySimulator() {
  if (!rugbyWorkspace || !rugbyWorkspace.dom) {
    return;
  }

  stopRugbyPlayback();
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

  const { items, selectedId, byId, dom, playback } = rugbyWorkspace;

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
  dom.selectedName.textContent = selectedItem ? (selectedItem.id === 'ball' ? 'Ball' : `${selectedItem.id} • ${selectedItem.name}`) : '—';
  dom.recordingState.textContent = selectedItem?.isRecording ? 'ON' : 'OFF';
  dom.recordingState.classList.toggle('is-on', Boolean(selectedItem?.isRecording));
  dom.playbackState.textContent = playback.state.toUpperCase();
  dom.playbackState.classList.toggle('is-on', playback.state === 'playing');

  if (dom.recordingTitle && document.activeElement !== dom.recordingTitle) {
    dom.recordingTitle.value = rugbyWorkspace.recordingMeta.title;
  }

  if (dom.recordingSubtitle && document.activeElement !== dom.recordingSubtitle) {
    dom.recordingSubtitle.value = rugbyWorkspace.recordingMeta.subtitle;
  }

  if (dom.recordingSelect) {
    const selectValue = rugbyWorkspace.loadedRecordingId;
    if (dom.recordingSelect.value !== selectValue) {
      dom.recordingSelect.value = selectValue;
    }
  }
}

function renderRugbyChildView(sheetElement, nextView) {
  const childContent = sheetElement.querySelector('[data-rugby-child-content]');
  if (!childContent) {
    return;
  }

  rugbyPanelState.activeView = nextView === 'simulator' ? 'simulator' : 'moves';

  sheetElement.querySelectorAll('[data-rugby-view]').forEach((button) => {
    const isActive = button.dataset.rugbyView === rugbyPanelState.activeView;
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
  if (libraryElement) {
    libraryElement.innerHTML = getRugbyMovesMarkup();
  }
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

    return parsedLinks.filter((item) => item && typeof item === 'object' && normalizeUrl(item.url));
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
    destroyRugbyWorkspace();
    renderEngineeringSheet(sheetElement);
    return;
  }

  if (categoryKey === 'rugby') {
    renderRugbySheet(sheetElement);
    return;
  }

  destroyRugbyWorkspace();
  renderBasicCategorySheet(sheetElement, content);
}

function refreshTopicLinks(sheetElement, topicKey) {
  const linksContainer = sheetElement.querySelector(`[data-topic-links="${topicKey}"]`);
  if (linksContainer) {
    linksContainer.innerHTML = getTopicLinksMarkup(topicKey);
  }
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
  if (!rugbyWorkspace || !rugbyWorkspace.dom || !sheetElement.contains(rugbyWorkspace.dom.pitch)) {
    return;
  }

  const titleInput = event.target.closest('[data-rugby-recording-title]');
  if (titleInput) {
    rugbyWorkspace.recordingMeta.title = String(titleInput.value ?? '').trim();
    return;
  }

  const subtitleInput = event.target.closest('[data-rugby-recording-subtitle]');
  if (subtitleInput) {
    rugbyWorkspace.recordingMeta.subtitle = String(subtitleInput.value ?? '').trim();
    return;
  }

  const selector = event.target.closest('[data-rugby-selector]');
  if (!selector) {
    return;
  }

  const selectedId = String(selector.value ?? '').trim();
  if (rugbyWorkspace.byId.has(selectedId)) {
    rugbyWorkspace.selectedId = selectedId;
    renderRugbyBoard();
  }
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

    const topicLinks = loadTopicLinks(topicKey);
    topicLinks.push({ label: String(labelInput?.value ?? '').trim(), url: safeUrl });
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

    const filteredLinks = loadTopicLinks(topicKey).filter((_, index) => index !== linkIndex);
    saveTopicLinks(topicKey, filteredLinks);
    clearTopicError(sheetElement, topicKey);
    refreshTopicLinks(sheetElement, topicKey);
  }
}

function handleRugbyPointerDown(event, sheetElement) {
  if (!rugbyWorkspace || !rugbyWorkspace.dom || !sheetElement.contains(rugbyWorkspace.dom.pitch)) {
    return;
  }

  const markerButton = event.target.closest('[data-rugby-marker]');
  if (!markerButton) {
    return;
  }

  const markerId = String(markerButton.dataset.rugbyMarker ?? '').trim();
  const markerItem = rugbyWorkspace.byId.get(markerId);
  if (!markerItem) {
    return;
  }

  if (rugbyWorkspace.playback.state === 'playing') {
    return;
  }

  rugbyWorkspace.selectedId = markerId;
  const markerRect = markerButton.getBoundingClientRect();
  rugbyWorkspace.drag = {
    id: markerId,
    pointerId: event.pointerId,
    offsetX: markerRect.left + markerRect.width / 2 - event.clientX,
    offsetY: markerRect.top + markerRect.height / 2 - event.clientY
  };

  if (markerItem.isRecording && !markerItem.path.length) {
    markerItem.path.push({ x: markerItem.x, y: markerItem.y });
  }

  rugbyWorkspace.dom.pitch.classList.add('is-dragging');
  renderRugbyBoard();
}

function handleRugbyClick(event, sheetElement) {
  const actionButton = event.target.closest('[data-action]');
  if (!actionButton) {
    return;
  }

  if (actionButton.dataset.action === 'rugby-switch-view') {
    renderRugbyChildView(sheetElement, actionButton.dataset.rugbyView);
    return;
  }

  if (actionButton.dataset.action === 'rugby-save-move') {
    const titleInput = sheetElement.querySelector('[data-rugby-move-title]');
    const videoInput = sheetElement.querySelector('[data-rugby-move-video]');
    const notesInput = sheetElement.querySelector('[data-rugby-move-notes]');

    const title = String(titleInput?.value ?? '').trim();
    const normalizedUrl = normalizeUrl(videoInput?.value ?? '');

    if (!title) {
      showRugbyError(sheetElement, 'Move name is required.');
      return;
    }

    const youtubeId = normalizedUrl ? extractYouTubeVideoId(normalizedUrl) : null;
    const thumbnailUrl = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : '';

    const existingMoves = loadRugbyMoves();
    existingMoves.unshift({
      id: `move-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'external-link',
      title,
      description: String(notesInput?.value ?? '').trim(),
      videoUrl: normalizedUrl ?? '',
      thumbnailUrl,
      createdAt: new Date().toISOString()
    });

    saveRugbyMoves(existingMoves);

    if (titleInput) titleInput.value = '';
    if (videoInput) videoInput.value = '';
    if (notesInput) notesInput.value = '';

    clearRugbyError(sheetElement);
    refreshRugbyMoves(sheetElement);
    return;
  }

  if (actionButton.dataset.action === 'rugby-delete-move') {
    const moveId = String(actionButton.dataset.rugbyMoveId ?? '').trim();
    if (!moveId) {
      return;
    }

    const filteredMoves = loadRugbyMoves().filter((move) => move.id !== moveId);
    saveRugbyMoves(filteredMoves);
    clearRugbyError(sheetElement);
    refreshRugbyMoves(sheetElement);
    return;
  }

  if (actionButton.dataset.action === 'rugby-open-simulator-move') {
    const recordingId = String(actionButton.dataset.recordingId ?? '').trim();
    if (!recordingId) {
      showRugbyError(sheetElement, 'This preset move does not have a simulator recording attached.');
      return;
    }

    rugbyPanelState.pendingRecordingId = recordingId;
    clearRugbyError(sheetElement);
    renderRugbyChildView(sheetElement, 'simulator');
    return;
  }

  if (!rugbyWorkspace || !rugbyWorkspace.dom || !sheetElement.contains(rugbyWorkspace.dom.pitch)) {
    return;
  }

  const selectedItem = rugbyWorkspace.byId.get(rugbyWorkspace.selectedId);
  if (!selectedItem) {
    return;
  }

  if (actionButton.dataset.action === 'rugby-start-recording') {
    stopRugbyPlayback();
    selectedItem.isRecording = true;
    if (!selectedItem.path.length) {
      selectedItem.path.push({ x: selectedItem.x, y: selectedItem.y });
    }
    setRugbySimulatorMessage(`Recording started for ${selectedItem.id === 'ball' ? 'Ball' : `${selectedItem.id} • ${selectedItem.name}`}.`);
  }

  if (actionButton.dataset.action === 'rugby-stop-recording') {
    selectedItem.isRecording = false;
    setRugbySimulatorMessage('Recording stopped.');
  }

  if (actionButton.dataset.action === 'rugby-clear-selected') {
    selectedItem.path = [];
    setRugbySimulatorMessage('Selected trail cleared.');
  }

  if (actionButton.dataset.action === 'rugby-clear-all') {
    stopRugbyPlayback();
    rugbyWorkspace.items.forEach((item) => {
      item.path = [];
      item.isRecording = false;
    });
    setRugbySimulatorMessage('All trails cleared.');
  }

  if (actionButton.dataset.action === 'rugby-reset-positions') {
    stopRugbyPlayback();
    rugbyWorkspace.items.forEach((item) => {
      item.x = item.startX;
      item.y = item.startY;
      item.path = [];
      item.isRecording = false;
    });

    rugbyWorkspace.drag = null;
    rugbyWorkspace.dom.pitch.classList.remove('is-dragging');
    setRugbySimulatorMessage('Board reset to starting positions.');
  }

  if (actionButton.dataset.action === 'rugby-save-recording') {
    const title = String(rugbyWorkspace.dom.recordingTitle?.value ?? rugbyWorkspace.recordingMeta.title ?? '').trim();
    const subtitle = String(rugbyWorkspace.dom.recordingSubtitle?.value ?? rugbyWorkspace.recordingMeta.subtitle ?? '').trim();

    if (!title) {
      setRugbySimulatorMessage('Move title is required before saving.');
      renderRugbyBoard();
      return;
    }

    const recording = createRugbyRecordingFromWorkspace(rugbyWorkspace, title, subtitle);
    const existingRecordings = loadRugbySimulatorRecordings();
    existingRecordings.unshift(recording);
    saveRugbySimulatorRecordings(existingRecordings);

    rugbyWorkspace.loadedRecordingId = recording.id;
    rugbyWorkspace.recordingMeta = { title, subtitle };
    rugbyWorkspace.playback.recording = recording;
    rugbyWorkspace.playback.elapsed = 0;
    if (rugbyWorkspace.dom.recordingSelect) {
      rugbyWorkspace.dom.recordingSelect.innerHTML = getRugbyRecordingOptionsMarkup(recording.id);
      rugbyWorkspace.dom.recordingSelect.value = recording.id;
    }

    setRugbySimulatorMessage(`Saved recording "${title}".`);
  }

  if (actionButton.dataset.action === 'rugby-load-recording') {
    const requestedId = String(rugbyWorkspace.dom.recordingSelect?.value ?? '').trim();
    if (!requestedId) {
      setRugbySimulatorMessage('Choose a saved recording to load.');
      renderRugbyBoard();
      return;
    }

    const selectedRecording = loadRugbySimulatorRecordings().find((recording) => recording.id === requestedId);
    if (!selectedRecording) {
      setRugbySimulatorMessage('Recording not found. It may have been removed.');
      renderRugbyBoard();
      return;
    }

    stopRugbyPlayback({ resetToStart: true });
    rugbyWorkspace.loadedRecordingId = selectedRecording.id;
    rugbyWorkspace.recordingMeta = { title: selectedRecording.title, subtitle: selectedRecording.subtitle || '' };
    rugbyWorkspace.playback.recording = selectedRecording;
    rugbyWorkspace.playback.elapsed = 0;
    applyRecordingToWorkspace(selectedRecording);
    setRugbySimulatorMessage(`Loaded recording "${selectedRecording.title}".`);
  }

  if (actionButton.dataset.action === 'rugby-play-recording') {
    const requestedId = String(rugbyWorkspace.dom.recordingSelect?.value || rugbyWorkspace.loadedRecordingId || '').trim();
    const selectedRecording = requestedId ? loadRugbySimulatorRecordings().find((recording) => recording.id === requestedId) : rugbyWorkspace.playback.recording;
    if (!selectedRecording) {
      setRugbySimulatorMessage('Save or load a recording before playback.');
      renderRugbyBoard();
      return;
    }

    rugbyWorkspace.loadedRecordingId = selectedRecording.id;
    rugbyWorkspace.playback.recording = selectedRecording;
    if (rugbyWorkspace.playback.state === 'idle') {
      applyRecordingToWorkspace(selectedRecording);
    }
    startRugbyPlayback();
    setRugbySimulatorMessage(`Playing "${selectedRecording.title}".`);
  }

  if (actionButton.dataset.action === 'rugby-pause-recording') {
    stopRugbyPlayback();
    setRugbySimulatorMessage('Playback paused.');
  }

  if (actionButton.dataset.action === 'rugby-reset-playback') {
    stopRugbyPlayback({ resetToStart: true });
    rugbyWorkspace.playback.state = 'idle';
    setRugbySimulatorMessage('Playback reset to start.');
  }

  if (actionButton.dataset.action === 'rugby-publish-recording') {
    const recordingId = String(rugbyWorkspace.dom.recordingSelect?.value || rugbyWorkspace.loadedRecordingId || '').trim();
    if (!recordingId) {
      setRugbySimulatorMessage('Save a recording first, then publish it to Preset Moves.');
      renderRugbyBoard();
      return;
    }

    const recording = loadRugbySimulatorRecordings().find((item) => item.id === recordingId);
    if (!recording) {
      setRugbySimulatorMessage('Recording not found. Please load it again.');
      renderRugbyBoard();
      return;
    }

    const moves = loadRugbyMoves();
    moves.unshift({
      id: `preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'simulator-move',
      title: recording.title,
      description: recording.subtitle || 'Simulator move recording.',
      sourceLabel: 'Simulator',
      recordingId: recording.id,
      thumbnailUrl: '',
      createdAt: new Date().toISOString()
    });
    saveRugbyMoves(moves);
    setRugbySimulatorMessage(`Published "${recording.title}" to Preset Moves.`);
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

  setActiveCategory(categoryButtons, sheetElement, categoryButtons[0].dataset.category);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCategoryExplorer, { once: true });
} else {
  initCategoryExplorer();
}

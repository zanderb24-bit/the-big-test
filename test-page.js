const CATEGORY_CONTENT = {
  engineering: {
    title: 'Engineering',
    description: 'Projects, systems design, architecture decisions, and practical problem solving.',
    bullets: ['Current builds', 'Technical notes', 'Ideas to prototype'],
    tagLine: 'Focus: reliability • maintainability • iteration'
  },
  rugby: {
    title: 'Rugby',
    description: 'Preset moves library with quick access to video and reference links.',
    bullets: ['Moves library', 'Video references', 'Saved locally'],
    tagLine: 'Focus: prep • replay • execution'
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

function renderRugbySheet(sheetElement) {
  sheetElement.innerHTML = `
    <p class="sheet-tag">Rugby Workspace • Preset Moves Library</p>
    <h3>Rugby</h3>
    <p class="sheet-description">Save reusable rugby move references and open them quickly from visual cards.</p>

    <section class="rugby-workspace">
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
    </section>
  `;
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
    sheetElement.innerHTML = '<p class="sheet-placeholder">Choose a category above to view details.</p>';
    return;
  }

  if (categoryKey === 'engineering') {
    renderEngineeringSheet(sheetElement);
    return;
  }

  if (categoryKey === 'rugby') {
    renderRugbySheet(sheetElement);
    return;
  }

  renderBasicCategorySheet(sheetElement, content);
}

function refreshTopicLinks(sheetElement, topicKey) {
  const linksContainer = sheetElement.querySelector(`[data-topic-links="${topicKey}"]`);
  if (!linksContainer) {
    return;
  }

  linksContainer.innerHTML = getTopicLinksMarkup(topicKey);
}

function refreshRugbyMoves(sheetElement) {
  const libraryElement = sheetElement.querySelector('[data-rugby-library]');
  if (!libraryElement) {
    return;
  }

  libraryElement.innerHTML = getRugbyMovesMarkup();
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
  const removeButton = event.target.closest('[data-action="remove-rugby-move"]');
  if (!removeButton) {
    return;
  }

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

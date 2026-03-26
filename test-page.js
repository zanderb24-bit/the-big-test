const CATEGORY_CONTENT = {
  engineering: {
    title: 'Engineering',
    description: 'Projects, systems design, architecture decisions, and practical problem solving.',
    bullets: ['Current builds', 'Technical notes', 'Ideas to prototype'],
    tagLine: 'Focus: reliability • maintainability • iteration'
  },
  rugby: {
    title: 'Rugby',
    description: 'Team tracking with fixtures, training structure, and tactical analysis.',
    bullets: ['Match notes', 'Training focus', 'Team updates'],
    tagLine: 'Focus: conditioning • set pieces • review'
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
  });

  setActiveCategory(categoryButtons, sheetElement, categoryButtons[0].dataset.category);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCategoryExplorer, { once: true });
} else {
  initCategoryExplorer();
}

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

function renderCategorySheet(sheetElement, categoryKey) {
  if (!sheetElement) {
    return;
  }

  const content = CATEGORY_CONTENT[categoryKey];

  if (!content) {
    sheetElement.innerHTML = '<p class="sheet-placeholder">Choose a category above to view details.</p>';
    return;
  }

  const bulletsMarkup = content.bullets.map((bullet) => `<li>${bullet}</li>`).join('');

  sheetElement.innerHTML = `
    <p class="sheet-tag">${content.tagLine}</p>
    <h3>${content.title}</h3>
    <p class="sheet-description">${content.description}</p>
    <ul class="sheet-list">${bulletsMarkup}</ul>
  `;
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

  setActiveCategory(categoryButtons, sheetElement, categoryButtons[0].dataset.category);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCategoryExplorer, { once: true });
} else {
  initCategoryExplorer();
}

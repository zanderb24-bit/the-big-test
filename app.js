const API_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd,gbp&include_24hr_change=true&include_last_updated_at=true';
const REFRESH_INTERVAL_MS = 30_000;
const LOADER_DURATION_MS = 3_300;
const LOADER_FAILSAFE_MS = 4_800;

const MAIN_ASSETS = {
  bitcoin: {
    chartTitle: 'BTCUSD Chart',
    chartSymbol: 'BITSTAMP:BTCUSD',
    labels: ['BTC Price (USD)', 'BTC Price (GBP)', 'BTC 24h Change (%)']
  },
  ethereum: {
    chartTitle: 'ETHUSD Chart',
    chartSymbol: 'COINBASE:ETHUSD',
    labels: ['ETH Price (USD)', 'ETH Price (GBP)', 'ETH 24h Change (%)']
  },
  gold: {
    chartTitle: 'XAUUSD Chart',
    chartSymbol: 'OANDA:XAUUSD',
    labels: ['Gold Spot (USD)', 'Gold Spot (GBP)', '24h Change (%)']
  },
  oil: {
    chartTitle: 'USOIL Chart',
    chartSymbol: 'TVC:USOIL',
    labels: ['WTI Price (USD)', 'WTI Price (GBP)', '24h Change (%)']
  }
};

let activeMainAsset = 'bitcoin';
let latestMarketData = null;
let dashboardInitialized = false;
let refreshIntervalId = null;

const elements = {
  loaderOverlay: null,
  loaderRing: null,
  loaderDot: null,
  loaderText: null,
  dashboardRoot: null,
  refreshButton: null,
  lastUpdated: null,
  mainChartHeading: null,
  mainStatLabel1: null,
  mainStatLabel2: null,
  mainStatLabel3: null,
  btcPriceUsd: null,
  btcPriceGbp: null,
  btcChange24h: null,
  ethPriceUsd: null,
  ethChange24h: null,
  assetCards: [],
  mainAssetButtons: []
};

function cacheElements() {
  elements.loaderOverlay = document.getElementById('loader-overlay');
  elements.loaderRing = document.getElementById('loader-ring');
  elements.loaderDot = document.getElementById('loader-dot');
  elements.loaderText = document.getElementById('loader-text');
  elements.dashboardRoot = document.getElementById('dashboard-root');
  elements.refreshButton = document.getElementById('refresh-btn');
  elements.lastUpdated = document.getElementById('last-updated');
  elements.mainChartHeading = document.getElementById('main-chart-heading');
  elements.mainStatLabel1 = document.getElementById('main-stat-label-1');
  elements.mainStatLabel2 = document.getElementById('main-stat-label-2');
  elements.mainStatLabel3 = document.getElementById('main-stat-label-3');
  elements.btcPriceUsd = document.getElementById('btc-price-usd');
  elements.btcPriceGbp = document.getElementById('btc-price-gbp');
  elements.btcChange24h = document.getElementById('btc-change-24h');
  elements.ethPriceUsd = document.getElementById('eth-price-usd');
  elements.ethChange24h = document.getElementById('eth-change-24h');
  elements.assetCards = Array.from(document.querySelectorAll('.asset-card'));
  elements.mainAssetButtons = Array.from(document.querySelectorAll('[data-main-asset]'));
}

function isValidNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatCurrency(value, currency) {
  if (!isValidNumber(value)) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(value);
}

function formatPercent(value) {
  if (!isValidNumber(value)) {
    return '—';
  }

  return `${value.toFixed(2)}%`;
}

function formatDate(unixTimestampSeconds) {
  if (!isValidNumber(unixTimestampSeconds)) {
    return '—';
  }

  const date = new Date(unixTimestampSeconds * 1000);

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'medium'
  }).format(date);
}

function updateChangeClass(element, value) {
  if (!element) {
    return;
  }

  const isPositive = isValidNumber(value) && value >= 0;
  const isNegative = isValidNumber(value) && value < 0;

  element.classList.toggle('positive', isPositive);
  element.classList.toggle('negative', isNegative);
}

function setRefreshing(isRefreshing) {
  if (!elements.refreshButton) {
    return;
  }

  elements.refreshButton.disabled = isRefreshing;
  elements.refreshButton.textContent = isRefreshing ? 'Refreshing…' : 'Refresh';
}

function getMainAssetValues(asset, data) {
  const btc = data?.bitcoin || {};
  const eth = data?.ethereum || {};

  if (asset === 'bitcoin') {
    return [btc.usd, btc.gbp, btc.usd_24h_change];
  }

  if (asset === 'ethereum') {
    return [eth.usd, eth.gbp, eth.usd_24h_change];
  }

  return [null, null, null];
}

function highlightMainAssetCard(asset) {
  elements.assetCards.forEach((card) => {
    card.classList.toggle('selected', card.dataset.mainAsset === asset);
  });
}

function renderMainAsset(asset, data) {
  if (!elements.mainChartHeading || !elements.mainStatLabel1 || !elements.mainStatLabel2 || !elements.mainStatLabel3) {
    return;
  }

  const config = MAIN_ASSETS[asset] || MAIN_ASSETS.bitcoin;
  const [value1, value2, change] = getMainAssetValues(asset, data);

  elements.mainChartHeading.textContent = config.chartTitle;
  elements.mainStatLabel1.textContent = config.labels[0];
  elements.mainStatLabel2.textContent = config.labels[1];
  elements.mainStatLabel3.textContent = config.labels[2];

  if (elements.btcPriceUsd) {
    elements.btcPriceUsd.textContent = formatCurrency(value1, 'USD');
  }

  if (elements.btcPriceGbp) {
    elements.btcPriceGbp.textContent = formatCurrency(value2, 'GBP');
  }

  if (elements.btcChange24h) {
    elements.btcChange24h.textContent = formatPercent(change);
    updateChangeClass(elements.btcChange24h, change);
  }

  buildTradingViewWidget('tradingview_btc_chart', config.chartSymbol, true);
  highlightMainAssetCard(asset);
}

function updateView(data) {
  const btc = data?.bitcoin || {};
  const eth = data?.ethereum || {};

  if (elements.lastUpdated) {
    elements.lastUpdated.textContent = formatDate(btc.last_updated_at ?? eth.last_updated_at);
  }

  if (elements.ethPriceUsd) {
    elements.ethPriceUsd.textContent = formatCurrency(eth.usd, 'USD');
  }

  if (elements.ethChange24h) {
    elements.ethChange24h.textContent = formatPercent(eth.usd_24h_change);
    updateChangeClass(elements.ethChange24h, eth.usd_24h_change);
  }

  latestMarketData = data;
  renderMainAsset(activeMainAsset, data);
}

async function fetchMarketData() {
  setRefreshing(true);

  try {
    const response = await fetch(API_URL, {
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`CoinGecko request failed (${response.status})`);
    }

    const data = await response.json();

    if (!data?.bitcoin && !data?.ethereum) {
      throw new Error('Unexpected API response.');
    }

    updateView(data);
  } catch (error) {
    console.warn('Live market refresh failed; preserving previous values.', error);
  } finally {
    setRefreshing(false);
  }
}

function buildTradingViewWidget(containerId, symbol, forceRebuild = false) {
  const container = document.getElementById(containerId);

  if (!window.TradingView || !container) {
    return;
  }

  if (forceRebuild) {
    if (container.dataset.symbol === symbol && container.dataset.widgetLoaded === 'true') {
      return;
    }

    container.innerHTML = '';
    container.dataset.widgetLoaded = 'false';
  } else if (container.dataset.widgetLoaded === 'true') {
    return;
  }

  // eslint-disable-next-line no-new
  new window.TradingView.widget({
    autosize: true,
    symbol,
    interval: '60',
    timezone: 'Etc/UTC',
    theme: 'dark',
    style: '1',
    locale: 'en',
    enable_publishing: false,
    hide_top_toolbar: false,
    allow_symbol_change: false,
    container_id: containerId
  });

  container.dataset.widgetLoaded = 'true';
  container.dataset.symbol = symbol;
}

function initTradingViewWidgets() {
  const createWidgets = () => {
    buildTradingViewWidget('tradingview_btc_chart', MAIN_ASSETS[activeMainAsset].chartSymbol);
  };

  const script = document.querySelector('script[src="https://s3.tradingview.com/tv.js"]');

  if (script) {
    script.addEventListener('load', createWidgets, { once: true });
  }

  createWidgets();
}

function setMainAsset(asset) {
  if (!MAIN_ASSETS[asset]) {
    return;
  }

  activeMainAsset = asset;
  renderMainAsset(asset, latestMarketData);
}

function bindEvents() {
  elements.mainAssetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setMainAsset(button.dataset.mainAsset);
    });
  });

  if (elements.refreshButton) {
    elements.refreshButton.addEventListener('click', fetchMarketData);
  }
}

function runLoadingCinematic() {
  return new Promise((resolve) => {
    const ring = elements.loaderRing;
    const text = elements.loaderText;
    const dot = elements.loaderDot;

    if (!ring || !text || !dot) {
      resolve();
      return;
    }

    const startTime = performance.now();
    let finished = false;

    const finish = () => {
      if (finished) {
        return;
      }

      finished = true;
      ring.style.setProperty('--progress-angle', '360deg');
      text.textContent = 'Ready';
      dot.classList.add('is-complete');
      resolve();
    };

    const failsafeTimer = window.setTimeout(finish, LOADER_FAILSAFE_MS);

    const tick = (now) => {
      if (finished) {
        return;
      }

      const elapsed = now - startTime;
      const progress = Math.min(elapsed / LOADER_DURATION_MS, 1);
      const angle = `${Math.round(progress * 360)}deg`;

      ring.style.setProperty('--progress-angle', angle);

      if (progress < 0.33) {
        text.textContent = 'Booting dashboard…';
      } else if (progress < 0.66) {
        text.textContent = 'Loading market modules…';
      } else if (progress < 1) {
        text.textContent = 'Syncing live widgets…';
      } else {
        window.clearTimeout(failsafeTimer);
        finish();
        return;
      }

      window.requestAnimationFrame(tick);
    };

    window.requestAnimationFrame(tick);
  });
}

function revealDashboard() {
  if (elements.dashboardRoot) {
    elements.dashboardRoot.classList.remove('dashboard-hidden');
    elements.dashboardRoot.classList.add('dashboard-visible');
  }

  if (elements.loaderOverlay) {
    elements.loaderOverlay.classList.add('is-hidden');
  }
}

async function initDashboard() {
  if (dashboardInitialized) {
    return;
  }

  dashboardInitialized = true;

  try {
    await runLoadingCinematic();
  } catch (error) {
    console.warn('Loading cinematic failed; continuing startup.', error);
  } finally {
    revealDashboard();
  }

  void fetchMarketData();

  if (!refreshIntervalId) {
    refreshIntervalId = window.setInterval(fetchMarketData, REFRESH_INTERVAL_MS);
  }

  initTradingViewWidgets();
}

function startApp() {
  cacheElements();
  bindEvents();
  void initDashboard();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp, { once: true });
} else {
  startApp();
}

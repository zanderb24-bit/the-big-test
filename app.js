const API_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd,gbp&include_24hr_change=true&include_last_updated_at=true';
const REFRESH_INTERVAL_MS = 30_000;
const LOADER_DURATION_MS = 3_500;

const elements = {
  refreshButton: document.getElementById('refresh-btn'),
  lastUpdated: document.getElementById('last-updated'),
  dashboardRoot: document.getElementById('dashboard-root'),
  loaderOverlay: document.getElementById('loader-overlay'),
  loaderRing: document.getElementById('loader-ring'),
  loaderDot: document.getElementById('loader-dot'),
  loaderText: document.getElementById('loader-text'),
  mainChartHeading: document.getElementById('main-chart-heading'),
  mainStatLabel1: document.getElementById('main-stat-label-1'),
  mainStatLabel2: document.getElementById('main-stat-label-2'),
  mainStatLabel3: document.getElementById('main-stat-label-3'),
  btcPriceUsd: document.getElementById('btc-price-usd'),
  btcPriceGbp: document.getElementById('btc-price-gbp'),
  btcChange24h: document.getElementById('btc-change-24h'),
  assetCards: document.querySelectorAll('.asset-card'),
  mainAssetButtons: document.querySelectorAll('[data-main-asset]')
};

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
  const isPositive = isValidNumber(value) && value >= 0;
  const isNegative = isValidNumber(value) && value < 0;

  element.classList.toggle('positive', isPositive);
  element.classList.toggle('negative', isNegative);
}

function setRefreshing(isRefreshing) {
  elements.refreshButton.disabled = isRefreshing;
  elements.refreshButton.textContent = isRefreshing ? 'Refreshing…' : 'Refresh';
}

function updateView(data) {
  const btc = data.bitcoin || {};
  const eth = data.ethereum || {};

  elements.lastUpdated.textContent = formatDate(btc.last_updated_at ?? eth.last_updated_at);
  latestMarketData = data;
  renderMainAsset(activeMainAsset, data);
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

function renderMainAsset(asset, data) {
  const config = MAIN_ASSETS[asset] || MAIN_ASSETS.bitcoin;
  const [value1, value2, change] = getMainAssetValues(asset, data);

  elements.mainChartHeading.textContent = config.chartTitle;
  elements.mainStatLabel1.textContent = config.labels[0];
  elements.mainStatLabel2.textContent = config.labels[1];
  elements.mainStatLabel3.textContent = config.labels[2];

  elements.btcPriceUsd.textContent = formatCurrency(value1, 'USD');
  elements.btcPriceGbp.textContent = formatCurrency(value2, 'GBP');
  elements.btcChange24h.textContent = formatPercent(change);
  updateChangeClass(elements.btcChange24h, change);

  buildTradingViewWidget('tradingview_btc_chart', config.chartSymbol, true);
  highlightMainAssetCard(asset);
}

function highlightMainAssetCard(asset) {
  elements.assetCards.forEach((card) => {
    card.classList.toggle('selected', card.dataset.mainAsset === asset);
  });
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
    // Silent failure by design: keep existing values on screen.
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
    buildTradingViewWidget('tradingview_btc_chart', 'BITSTAMP:BTCUSD');
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

function runLoadingCinematic() {
  if (!elements.loaderRing || !elements.loaderDot || !elements.loaderText) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const start = Date.now();
    let finished = false;

    const finish = () => {
      if (finished) {
        return;
      }

      finished = true;
      clearInterval(intervalId);
      clearTimeout(failsafeTimeoutId);
      elements.loaderRing.style.setProperty('--progress-angle', '360deg');
      elements.loaderRing.classList.add('is-complete');
      elements.loaderText.textContent = 'Dashboard online';
      elements.loaderDot.classList.add('is-complete');
      setTimeout(resolve, 120);
    };

    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / LOADER_DURATION_MS, 1);
      const angle = Math.round(progress * 360);
      elements.loaderRing.style.setProperty('--progress-angle', `${angle}deg`);

      if (progress >= 1) {
        finish();
      }
    };

    const intervalId = setInterval(tick, 50);
    const failsafeTimeoutId = setTimeout(finish, LOADER_DURATION_MS + 300);
    tick();
  });
}

function revealDashboard() {
  elements.dashboardRoot?.classList.remove('dashboard-hidden');
  elements.dashboardRoot?.classList.add('dashboard-visible');
  elements.loaderOverlay?.classList.add('is-hidden');
}

async function initDashboard() {
  if (dashboardInitialized) {
    return;
  }

  dashboardInitialized = true;
  const revealFallbackTimeoutId = setTimeout(() => {
    revealDashboard();
  }, LOADER_DURATION_MS + 2_000);

  try {
    await runLoadingCinematic();
  } catch (error) {
    console.warn('Loader cinematic failed; continuing with dashboard reveal.', error);
  }

  revealDashboard();
  clearTimeout(revealFallbackTimeoutId);
  await fetchMarketData();
  setInterval(fetchMarketData, REFRESH_INTERVAL_MS);
  initTradingViewWidgets();
}

elements.mainAssetButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setMainAsset(button.dataset.mainAsset);
  });
});

elements.refreshButton.addEventListener('click', fetchMarketData);

initDashboard();

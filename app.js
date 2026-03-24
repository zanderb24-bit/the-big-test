const API_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd,gbp&include_24hr_change=true&include_last_updated_at=true';
const REFRESH_INTERVAL_MS = 30_000;

const elements = {
  refreshButton: document.getElementById('refresh-btn'),
  lastUpdated: document.getElementById('last-updated'),
  mainChartHeading: document.getElementById('main-chart-heading'),
  mainStatLabel1: document.getElementById('main-stat-label-1'),
  mainStatLabel2: document.getElementById('main-stat-label-2'),
  mainStatLabel3: document.getElementById('main-stat-label-3'),
  btcPriceUsd: document.getElementById('btc-price-usd'),
  btcPriceGbp: document.getElementById('btc-price-gbp'),
  btcChange24h: document.getElementById('btc-change-24h'),
  ethPriceUsd: document.getElementById('eth-price-usd'),
  ethChange24h: document.getElementById('eth-change-24h'),
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

  elements.btcPriceUsd.textContent = formatCurrency(btc.usd, 'USD');
  elements.btcPriceGbp.textContent = formatCurrency(btc.gbp, 'GBP');
  elements.btcChange24h.textContent = formatPercent(btc.usd_24h_change);
  updateChangeClass(elements.btcChange24h, btc.usd_24h_change);

  elements.ethPriceUsd.textContent = formatCurrency(eth.usd, 'USD');
  elements.ethChange24h.textContent = formatPercent(eth.usd_24h_change);
  updateChangeClass(elements.ethChange24h, eth.usd_24h_change);

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
    buildTradingViewWidget('tradingview_eth_chart', 'COINBASE:ETHUSD');
    buildTradingViewWidget('tradingview_gold_chart', 'OANDA:XAUUSD');
    buildTradingViewWidget('tradingview_oil_chart', 'TVC:USOIL');
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

elements.mainAssetButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setMainAsset(button.dataset.mainAsset);
  });
});

elements.refreshButton.addEventListener('click', fetchMarketData);

fetchMarketData();
setInterval(fetchMarketData, REFRESH_INTERVAL_MS);
initTradingViewWidgets();

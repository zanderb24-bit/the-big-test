const API_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd,gbp&include_24hr_change=true&include_last_updated_at=true';
const REFRESH_INTERVAL_MS = 30_000;

const elements = {
  refreshButton: document.getElementById('refresh-btn'),
  lastUpdated: document.getElementById('last-updated'),
  btcPriceUsd: document.getElementById('btc-price-usd'),
  btcPriceGbp: document.getElementById('btc-price-gbp'),
  btcChange24h: document.getElementById('btc-change-24h'),
  ethPriceUsd: document.getElementById('eth-price-usd'),
  ethChange24h: document.getElementById('eth-change-24h')
};

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

function buildTradingViewWidget(containerId, symbol) {
  const container = document.getElementById(containerId);

  if (!window.TradingView || !container || container.dataset.widgetLoaded === 'true') {
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

elements.refreshButton.addEventListener('click', fetchMarketData);

fetchMarketData();
setInterval(fetchMarketData, REFRESH_INTERVAL_MS);
initTradingViewWidgets();

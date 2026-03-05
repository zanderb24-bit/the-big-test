const API_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,gbp&include_24hr_change=true&include_24hr_high=true&include_24hr_low=true&include_last_updated_at=true';
const REFRESH_INTERVAL_MS = 30_000;

const elements = {
  refreshButton: document.getElementById('refresh-btn'),
  loading: document.getElementById('loading'),
  error: document.getElementById('error'),
  lastUpdated: document.getElementById('last-updated'),
  priceUsd: document.getElementById('price-usd'),
  priceGbp: document.getElementById('price-gbp'),
  change24h: document.getElementById('change-24h'),
  highLow: document.getElementById('high-low')
};

function formatCurrency(value, currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(value);
}

function formatPercent(value) {
  return `${value.toFixed(2)}%`;
}

function formatDate(unixTimestampSeconds) {
  const date = new Date(unixTimestampSeconds * 1000);
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'medium'
  }).format(date);
}

function setLoading(isLoading) {
  elements.loading.hidden = !isLoading;
  elements.refreshButton.disabled = isLoading;
}

function setError(message = '') {
  elements.error.textContent = message;
  elements.error.hidden = !message;
}

function updateView(data) {
  const btc = data.bitcoin;

  elements.priceUsd.textContent = formatCurrency(btc.usd, 'USD');
  elements.priceGbp.textContent = formatCurrency(btc.gbp, 'GBP');

  const change = btc.usd_24h_change;
  elements.change24h.textContent = formatPercent(change);
  elements.change24h.classList.toggle('positive', change >= 0);
  elements.change24h.classList.toggle('negative', change < 0);

  elements.highLow.textContent = `${formatCurrency(btc.usd_24h_high, 'USD')} / ${formatCurrency(
    btc.usd_24h_low,
    'USD'
  )}`;

  elements.lastUpdated.textContent = formatDate(btc.last_updated_at);
}

async function fetchBitcoinData() {
  setLoading(true);
  setError();

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

    if (!data?.bitcoin) {
      throw new Error('Unexpected API response.');
    }

    updateView(data);
  } catch (error) {
    setError(
      'We could not refresh live market data right now. Please try again in a moment—previous values stay visible.'
    );
    console.error(error);
  } finally {
    setLoading(false);
  }
}

function initTradingViewWidget() {
  const createWidget = () => {
    if (!window.TradingView) {
      return;
    }

    // eslint-disable-next-line no-new
    new window.TradingView.widget({
      autosize: true,
      symbol: 'BITSTAMP:BTCUSD',
      interval: '60',
      timezone: 'Etc/UTC',
      theme: 'light',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      hide_top_toolbar: false,
      allow_symbol_change: false,
      container_id: 'tradingview_btc_chart'
    });
  };

  const script = document.querySelector('script[src="https://s3.tradingview.com/tv.js"]');

  if (script) {
    script.addEventListener('load', createWidget, { once: true });
  }

  createWidget();
}

elements.refreshButton.addEventListener('click', fetchBitcoinData);

fetchBitcoinData();
setInterval(fetchBitcoinData, REFRESH_INTERVAL_MS);
initTradingViewWidget();

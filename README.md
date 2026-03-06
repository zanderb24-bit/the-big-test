diff --git a/README.md b/README.md
new file mode 100644
index 0000000000000000000000000000000000000000..4611c0e3541082cd97a3724c15b0e72fc58c4bd0
--- /dev/null
+++ b/README.md
@@ -0,0 +1,112 @@
+# Bitcoin Dashboard (Static + GitHub Pages Ready)
+
+A fully static Bitcoin + Alt Assets dashboard built with plain **HTML, CSS, and vanilla JavaScript**.
+
+It fetches BTC/ETH metrics from CoinGecko in the browser (no backend, no Python) and embeds TradingView charts for BTCUSD, ETHUSD, Gold (XAUUSD), and Crude Oil (WTI).
+
+## Features
+
+### Bitcoin section (top)
+- **BTC Price (USD)**
+- **BTC Price (GBP)**
+- **BTC 24h Change (%)**
+- Full-width **BTCUSD TradingView chart** directly below BTC stats
+
+### Alt Assets section (below Bitcoin)
+Three vertical cards with embedded charts:
+- **Ethereum (ETH)**
+  - ETH Price (USD)
+  - ETH 24h Change (%)
+  - TradingView chart: `COINBASE:ETHUSD`
+- **Gold (XAUUSD)**
+  - Chart-only card (no CoinGecko price fetch)
+  - TradingView chart: `OANDA:XAUUSD`
+- **Crude Oil (WTI)**
+  - Chart-only card (no CoinGecko price fetch)
+  - TradingView chart: `TVC:USOIL`
+
+### Behavior
+- Single CoinGecko request for `bitcoin,ethereum`
+- Auto-refresh every **30 seconds**
+- Manual **Refresh** button
+- Simple **Last updated** timestamp line
+- Silent fetch-failure behavior (keeps existing values visible)
+- Responsive layout:
+  - Desktop: 3 alt-asset columns
+  - Tablet: 2 columns
+  - Mobile: 1 column
+
+## Project Structure
+
+```text
+/
+  index.html
+  styles.css
+  app.js
+  README.md
+```
+
+## Local Usage
+
+1. Clone or download this repository.
+2. Open `index.html` in your browser.
+3. Data and charts load client-side.
+
+> This project is fully static: no backend, no build step, no API keys.
+
+## GitHub Pages Deployment (Exact Steps)
+
+1. Push this project to GitHub.
+2. Open the repository on GitHub.
+3. Go to **Settings** → **Pages**.
+4. Under **Build and deployment**, set:
+   - **Source:** `Deploy from branch`
+   - **Branch:** `main`
+   - **Folder:** `/root`
+5. Save settings and wait for deployment.
+6. Open the published Pages URL shown in GitHub Pages settings.
+
+## Data Sources
+
+- CoinGecko public API (`/simple/price`) for BTC + ETH values
+- TradingView widgets for BTCUSD, ETHUSD, XAUUSD, and USOIL
+- No API keys are required
+
+## Screenshot Placeholder
+
+Add project screenshots once deployed:
+
+- `docs/screenshot-dashboard.png` (desktop)
+- `docs/screenshot-dashboard-mobile.png` (mobile)
+
+Markdown example:
+
+```md
+![Bitcoin dashboard screenshot](docs/screenshot-dashboard.png)
+```
+
+## Troubleshooting
+
+### 1) CoinGecko request issues (network/CORS/rate limits)
+- Public APIs can fail transiently.
+- The dashboard silently keeps last known values and tries again automatically.
+- Use manual **Refresh** after waiting a moment.
+
+### 2) TradingView charts not showing
+- Some ad blockers/privacy extensions block `s3.tradingview.com` scripts.
+- Disable blocking for the site and refresh.
+- Verify your network/firewall allows TradingView domains.
+
+### 3) GitHub Pages not updating
+- Confirm you pushed to the configured branch (`main`).
+- Re-check: **Deploy from branch → main → /root**.
+- Wait a few minutes for Pages propagation.
+
+### 4) Browser cache serving old files
+- Force refresh (`Ctrl+Shift+R` / `Cmd+Shift+R`).
+- Clear site cache or test in incognito mode.
+
+## Notes
+
+- Uses only relative paths (`styles.css`, `app.js`) for GitHub Pages compatibility.
+- No secrets or backend configuration are required.

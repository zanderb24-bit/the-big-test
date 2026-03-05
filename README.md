# Bitcoin Dashboard (Static + GitHub Pages Ready)

A fully static Bitcoin dashboard built with plain **HTML, CSS, and vanilla JavaScript**.

It fetches live market data from CoinGecko directly in the browser (no backend, no Python), displays key BTC stats, and includes a TradingView BTCUSD chart embed.

## Features

- Current BTC price in **USD** and **GBP**
- **24h change %**
- **24h high / low**
- **Last updated** timestamp
- Automatic refresh every **30 seconds**
- Manual **Refresh** button
- Friendly error handling (keeps existing values visible if a refresh fails)
- Lightweight loading state on first load and manual/auto refresh
- TradingView BTCUSD chart widget
- Responsive layout for desktop and mobile

## Project Structure

```text
/
  index.html
  styles.css
  app.js
  README.md
```

## Local Usage

1. Clone or download this repository.
2. Open `index.html` in your browser.
3. Data will load automatically from CoinGecko.

> Because this is a static client-side app, there is no build process and no server required.

## GitHub Pages Deployment (Exact Steps)

1. Push this project to GitHub.
2. Open the repository on GitHub.
3. Go to **Settings** → **Pages**.
4. Under **Build and deployment**, set:
   - **Source:** `Deploy from branch`
   - **Branch:** `main`
   - **Folder:** `/root`
5. Save settings and wait for deployment.
6. Open the published Pages URL shown in GitHub Pages settings.

## Data Source

- CoinGecko public API (`/simple/price` endpoint)
- No API key is required for this basic usage.

## Screenshot Placeholder

Add project screenshots here once deployed:

- `docs/screenshot-dashboard.png` (desktop)
- `docs/screenshot-dashboard-mobile.png` (mobile)

Markdown example:

```md
![Bitcoin dashboard screenshot](docs/screenshot-dashboard.png)
```

## Troubleshooting

### 1) CORS errors

- CoinGecko supports browser requests for this endpoint, but transient CORS/network issues can still happen.
- Hard refresh the page and retry.
- Test from a different network/browser profile.

### 2) API rate limits or temporary API downtime

- Public APIs can throttle or return non-200 responses when busy.
- The dashboard displays a friendly warning and keeps the last values visible.
- Wait and try again with the **Refresh** button.

### 3) GitHub Pages not updating

- Confirm you pushed to the configured branch (`main`).
- Re-check Pages settings: **Deploy from branch → main → /root**.
- Wait a few minutes for GitHub to rebuild.
- Confirm there are no failed workflow/build messages in Pages status.

### 4) Browser cache serving old files

- Force refresh (`Ctrl+Shift+R` / `Cmd+Shift+R`).
- Clear cache for the site.
- Open in a private/incognito window.

## Notes

- This project uses only relative paths (`styles.css`, `app.js`), so it works on GitHub Pages without server-only features.
- No secrets, tokens, or backend configuration are required.

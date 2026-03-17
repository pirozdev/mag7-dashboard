# Equity Research Dashboard — Mag 7 + TSM

Live dashboard: **https://[your-username].github.io/mag7-dashboard/**

## What is this?

A comprehensive equity research dashboard covering the Magnificent 7 + TSMC, featuring:
- 8 company deep-dives with verified financial data (SEC filings)
- Bull/Bear analysis with fair value ranges
- 21 FinTwit sentiment profiles
- 3 blind portfolio analyses with consensus allocation
- Weekly changelog tracking biggest moves

## Weekly Update Workflow (Every Monday)

### Step 1: Open Claude and say:
```
Kör veckouppdatering av equity research dashboard.
Uppdatera priser, multiplar, och flagga alla förändringar sedan förra veckan.
Förra veckans snapshot: [paste last week's snapshot from changelog]
```

### Step 2: Claude will automatically:
1. Search for current stock prices for all 8 companies
2. Check for any new earnings/guidance since last week
3. Recalculate all valuation multiples (P/E, EV/FCF, PEG)
4. Cross-reference ALL data against SEC filings (mandatory per user memory)
5. Update signal ratings if warranted
6. Generate changelog showing biggest moves
7. Produce verification report
8. Output updated `index.html`

### Step 3: Deploy
```bash
cp index.html docs/index.html  # or root depending on GH Pages config
git add -A
git commit -m "Weekly update: [date]"
git push
```

## Data Sources (Priority Order)
1. **SEC EDGAR** — 10-K, 10-Q, 8-K filings (primary)
2. **Company IR sites** — Earnings releases, press releases
3. **Financial data providers** — For real-time prices and consensus estimates
4. **FinTwit** — For sentiment tracking (manually curated)

## Disclaimer
This is NOT investment advice. It is a structured research tool based on publicly available data and AI-generated assessments. Always verify against primary sources. Never base investment decisions solely on this analysis. Consult a licensed financial advisor.

## Tech Stack
- Single-file HTML/CSS/JS (no dependencies, no build step)
- GitHub Pages for hosting
- Claude for weekly data refresh + verification

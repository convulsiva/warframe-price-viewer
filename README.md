# Warframe Price Viewer

A small desktop app for checking Warframe market prices on macOS and Windows.

## What It Does

- Search tradable Warframe items.
- View live sell and buy orders from warframe.market.
- Sort by online sellers and lowest price by default.
- Save favorite items.
- Set price alerts for favorite items when the lowest online sell price drops or rises by your chosen percent.
- Auto-refresh active market data every few seconds.
- Open the selected item directly on warframe.market.

## Development

```bash
npm install
npm run dev
```

Run the desktop app locally:

```bash
npm run tauri:dev
```

Build:

```bash
npm run build
npm run tauri:build
```

## Release Builds

Windows and macOS builds are produced by the GitHub Actions desktop build workflow and published through GitHub Releases.

<p align="center"><strong>created by convulsiva</strong></p>

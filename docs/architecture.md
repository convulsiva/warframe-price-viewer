# Architecture

## Understanding

The app is a read-only market viewer: search cached item metadata locally, select a real API-provided slug, fetch current order data, compute market summaries from visible active orders, and store personal UI data locally.

## Stack Options Considered

- Next.js: strong server/proxy story, but heavier than needed for a client-first MVP and static deployment.
- React + Vite: fast startup, simple static hosting, excellent TypeScript support, easy testing, and a local API proxy. Chosen.
- Tailwind/shadcn: good for design systems, but adds setup and generated component surface. For this MVP, custom CSS with semantic components is leaner.
- TanStack Query vs custom cache: TanStack Query is proven for stale times, retries, dedupe, and background refresh. Chosen.
- Fuse.js vs custom fuzzy search: Fuse.js is small and reliable. Chosen.

## Chosen Stack

- Vite + React + strict TypeScript.
- TanStack Query for API cache and request lifecycle.
- Zustand with `persist` middleware for favorites, recents, preferences.
- Zod for runtime validation at API boundaries.
- Fuse.js for local fuzzy search.
- Vitest/Testing Library/MSW for unit and integration tests.
- Playwright for end-to-end tests.

## Module Boundaries

- `src/api`: fetch client, endpoint functions, Zod schemas, error normalization.
- `src/domain`: normalized item/order models, transforms, filtering, sorting, market calculations.
- `src/features/search`: search box and result list.
- `src/features/market`: item summary, filters, order lists, states.
- `src/features/library`: favorites and recent items.
- `src/lib`: config, formatting, storage hooks, reusable helpers.

Components consume normalized domain models, not raw warframe.market response objects.

## Data Flow

1. App loads item manifest through `useItemsQuery`.
2. Search indexes normalized items and filters locally after debounce.
3. Selecting a result stores it in recent history and triggers item detail/orders queries.
4. Zod validates raw JSON.
5. Transformers normalize API data into `MarketItem` and `MarketOrder`.
6. Domain selectors compute metrics and filtered/sorted order lists.
7. Favorites store a snapshot of the latest summary for local price-change comparison.

## Caching

- TanStack Query handles request dedupe and retry.
- Manifest and detail data use long stale times.
- Orders use short stale time and low-frequency background refresh.
- Local favorites/recents persist in `localStorage`.
- No request is made for each typed character; search uses the cached manifest.
- API requests go to `/api/wfm` locally and are proxied to warframe.market by Vite to avoid browser CORS/edge-network failures.

## Errors

`ApiError` maps network, timeout, validation, 429, 509, 404, and server states to UI states. Cached stale data remains visible when refetching fails.

## Testing

- Unit: transforms, market calculations, filtering, local persistence helpers.
- Integration: search, order loading, API error state, refresh, filters with MSW.
- E2E: open app, search/select item, wait for prices, favorite, reload, verify persistence.

## Deployment

The app builds to static assets via `npm run build`. Production hosting should add a rewrite/proxy for `/api/wfm` to `https://api.warframe.market/v2`, or provide `VITE_WARFRAME_MARKET_API_BASE_URL` pointing at an equivalent backend proxy.

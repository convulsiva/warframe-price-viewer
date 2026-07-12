# Warframe.market API Research

Research date: 2026-07-12.

## Sources

- Official API docs page: https://warframe.market/api_docs
- Public OpenAPI mirror loaded by ReDoc: https://market-docs.warframestat.us/openapi.json
- Warframe.market Terms of Service: https://warframe.market/tos
- Current warframe.market frontend bundle, which creates clients for `https://api.warframe.market/v2/` and `https://api.warframe.market/v1/`.

## Version And Base URL

Use `https://api.warframe.market/v2`.

The public OpenAPI mirror describes OpenAPI 3.0.1, API `1.0.0`, server `https://api.warframe.market/v1`. Live checks on 2026-07-12 showed `v1` public item/order routes returning `Deprecated`, 404, or inconsistent responses, while the current site bundle initializes a `v2` client and `v2` endpoints return API payloads with `apiVersion: "0.25.0"`.

This is a poorly documented area. The app therefore uses the same `v2` public routes as the current frontend and keeps this decision isolated in `src/api/config.ts`.

## Selected Endpoints

- `GET /items`: item manifest.
- `GET /items/{slug}`: item detail, localized names/descriptions/icons/tags.
- `GET /orders/item/{slug}/top`: best buy and sell orders, already split into `buy` and `sell`.
- `GET /orders/item/{slug}`: full order list for filtering and counts.

Potential future endpoint:

- `GET /statistics`: present in frontend/OpenAPI, but `v2` details are not sufficiently documented for this MVP.

## Headers

Observed frontend headers:

- `language`: selected language, for example `en` or `ru`.
- `platform`: selected platform, for example `pc`.
- `crossplay`: `true` or `false`.

The app also sends:

- `Accept: application/json`.
- `Content-Type: application/json` for JSON requests.
- `User-Agent` cannot be set from browser code; if a future proxy is introduced, it should identify the app and contact/project URL.

## Auth

Public item and order browsing does not require user authentication. Authentication is only relevant for profile/order mutation endpoints, which are outside this read-only MVP.

## Limits

The ToS states that listing/API requests may not be faster than 3 requests per second, and contracts are limited to 10 per minute. The app avoids aggressive polling:

- item manifest is cached for 12 hours;
- item details are cached for 12 hours;
- order data is stale after 60 seconds;
- background order refresh is 5 minutes and disabled while offline.

## Platforms And Cross Play

The older OpenAPI enum lists `pc`, `xb1`, `ps4`, and `switch`; the current API responses also include Cross Play as a boolean on users/orders. The UI supports filtering by platforms present in the returned data and a Cross Play toggle.

## Languages

The site exposes language routes for `en`, `ru`, `ko`, `fr`, `sv`, `de`, `zh-hant`, `zh-hans`, `pt`, `es`, `pl`, `cs`, `uk`, `it`, `tr`, and `ja`. The `v2` item detail response contains `i18n` maps. The item manifest may include only the requested language and/or English depending on the endpoint response, so search indexes all names present and falls back to English.

## Response Shapes

`GET /items`:

```json
{
  "apiVersion": "0.25.0",
  "data": [
    {
      "id": "54aae292e7798909064f1575",
      "slug": "secura_dual_cestra",
      "tags": ["syndicate", "weapon", "secondary"],
      "i18n": {
        "en": {
          "name": "Secura Dual Cestra",
          "icon": "items/images/en/secura_dual_cestra.png",
          "thumb": "items/images/en/thumbs/secura_dual_cestra.128x128.png"
        }
      }
    }
  ]
}
```

`GET /items/{slug}`:

```json
{
  "apiVersion": "0.25.0",
  "data": {
    "id": "56783f24cbfa8f0432dd89a2",
    "slug": "lex_prime_set",
    "tags": ["weapon", "prime", "set", "secondary"],
    "setRoot": true,
    "reqMasteryRank": 8,
    "tradingTax": 6000,
    "tradable": true,
    "i18n": {
      "en": { "name": "Lex Prime Set", "icon": "...", "thumb": "..." },
      "ru": { "name": "Лекс Прайм: Комплект", "icon": "...", "thumb": "..." }
    }
  }
}
```

`GET /orders/item/{slug}/top`:

```json
{
  "apiVersion": "0.25.0",
  "data": {
    "sell": [{ "type": "sell", "platinum": 5, "quantity": 1, "user": { "status": "ingame" } }],
    "buy": [{ "type": "buy", "platinum": 3, "quantity": 2, "user": { "status": "ingame" } }]
  }
}
```

`GET /orders/item/{slug}`:

```json
{
  "apiVersion": "0.25.0",
  "data": [
    { "id": "...", "type": "sell", "platinum": 10, "visible": true, "updatedAt": "2026-06-25T05:23:39Z" }
  ]
}
```

## Errors

Observed/known statuses:

- `400`: validation/client error.
- `401`: auth required for protected routes.
- `403`: forbidden or deprecated route.
- `404`: route/item not found.
- `429`: too many requests.
- `509`: too many connections, exposed by site locale messages.
- `5xx`: server/API unavailable.
- Network timeout/offline should be handled separately.

The app normalizes these into `ApiError` with `kind`, `status`, and user-facing message.

## Pagination

The selected item and order endpoints returned arrays without pagination metadata in live checks. Search runs against the cached manifest rather than server pagination.

## Riven/Auction Details

Riven details are part of the auction/contract area (`/auctions`, `riven/weapons`, `riven/attributes`) and are not returned by ordinary item order endpoints. The MVP displays only fields actually present on ordinary orders. Riven support should be a separate future module.

## CORS And Proxy

Live browser-facing endpoints are designed for the frontend domain and may be subject to CORS policy changes. The MVP uses an app-relative `/api/wfm` path and Vite proxies it to `https://api.warframe.market/v2` in development and preview. This avoids browser CORS/edge failures observed during local testing. Production static hosting should provide the same rewrite/proxy, or `VITE_WARFRAME_MARKET_API_BASE_URL` should point to a compatible backend proxy.

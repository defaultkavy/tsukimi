# Changelog

## [0.3.0] - 2026-05-07

### Features
- **Auto Set Cookie on Every `$.fetch` in SSR**: The first request from client that render page content will be store to every `GlobalState` of session, every request to the same origin in this session by `$.fetch`, will share the same cookie from the first client request.
- **Send Request to `Bun.Server` in SSR**: The request to server from the same process is possible now, set `$.fetch.server = Bun.serve({ ... })` to enable this feature.

### Changes
- Bump version of `amateras` to `"^0.14.0"`.

## [0.2.0] - 2026-04-03

### Features
- New `selector` required option for insert `app` component to the selector target.

### Changes
- Bump version of `amateras` to `"^0.13.0"`.
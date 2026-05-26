# Changelog

## [0.4.0] - 2026-05-26

### Features
- **Update Amateras to V0.15.0**: Apply newest features.
- **Split Amateras Module From Project Bundle Code**: The bundle result will write Amateras packages code in a standalone file (AMATERAS.\[hash\].js), this is helpful to make index.js file import and run Amateras initialization code first before import any other files.
- **Root Configuration**: Set your entryfile directory path to `root` option in configuration, this help program find your project root path even start server in other directory.
- **Change Entrypoint to Entryfile**: Set your entry HTML filename to entryfile, default name is `index.html`.

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
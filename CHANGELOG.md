---
changelogVersion: 1
plugin: "byaiden_hunyuan"
version: "1.1.0"
locale: "en"
translations:
  zh-CN: CHANGELOG.zh-CN.md
---
# Changelog

## [1.1.0]

### Added

- Another New API gateway can be the upstream: bind the plugin to a New API channel (type 60) whose base URL is a gateway that has this plugin too. Requests go to that gateway's `/byaiden_hunyuan/...` paths with its token as a Bearer key. See "Through another New API gateway" in the README.
- `GET /v1/api/3d/query?id=` reads a 3D job with the gateway download addresses of its files.
- The native video query reports `tokenhub_usage.total_tokens`, so a gateway in front settles on the same tokens.

### Fixed

- Requests to TokenHub carry `Authorization: Bearer API_KEY`. Before, the key was sent without `Bearer`.
- `POST /v1/api/3d/query` reports the job's id and status. Before, it always answered `queued` without an id.

---
changelogVersion: 1
plugin: "byaiden_hunyuan"
version: "1.1.0"
locale: "zh-CN"
---
# Changelog

## [1.1.0]

### Added

- 可以把另一个 New API 网关作为上游：把插件绑定到 New API 渠道（类型 60），Base URL 填同样安装了本插件的网关。请求发往该网关的 `/byaiden_hunyuan/...` 路径，用它的令牌作为 Bearer 密钥。详见 README 的「经由另一个 New API 网关」。
- `GET /v1/api/3d/query?id=` 查询 3D 任务，返回文件的网关下载地址。
- 原生视频查询返回 `tokenhub_usage.total_tokens`，前面的网关可以按相同的 token 数结算。

### Fixed

- 发往 TokenHub 的请求带 `Authorization: Bearer API_KEY`。以前发送的密钥缺少 `Bearer`。
- `POST /v1/api/3d/query` 返回任务 id 和状态。以前总是返回 `queued` 且没有 id。

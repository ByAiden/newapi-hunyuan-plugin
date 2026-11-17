---
locale: zh-CN
---
# 腾讯混元生视频与生3D

[English](README.md) | **简体中文**

适用于 new-api Task Plugin API v1 的腾讯云 TokenHub 插件，支持混元文生视频、图生视频，以及文生3D、图生3D和多视图生3D。

## 渠道配置

1. 上传 `plugin.js`，启用插件并激活上传的版本。
2. 新建 **Task Plugin／任务插件** 渠道（类型 61），绑定 `byaiden_hunyuan`。
3. 在渠道密钥栏粘贴 [TokenHub API Key 管理](https://console.cloud.tencent.com/tokenhub/apikey) 创建的 API Key，并在 TokenHub 开通对应模型及后付费服务。
4. API 地址留空使用 `https://tokenhub.tencentmaas.com`，或填写该地址，不要加 `/v1`。添加下表所需模型。
5. 为各模型配置下方 `tiered_expr` 计费表达式。

客户端使用 `Authorization: Bearer NEW_API_TOKEN` 调用 new-api。上游使用 TokenHub API Key。旧版 `vclm.tencentcloudapi.com`、`ai3d.tencentcloudapi.com` 的 SecretId/SecretKey 不适用本插件。本插件直连腾讯云当前的 TokenHub 接口，无需 TC3 签名或外置代理。

## 模型和接口

| 模型 | 能力 | 限制 |
| --- | --- | --- |
| `hy-video-v1.5` | 文生视频、图生视频 | 单个 5 秒 720p 视频；文生比例 16:9、9:16、1:1、4:3、3:4；图生比例由图片决定 |
| `hy-3d-3.0` | 文生、图生、多视图生3D；Normal、LowPoly、Geometry、Sketch | 支持 PBR、自定义面数及额外输出格式 |
| `hy-3d-3.1` | 文生、图生、多视图生3D；Normal、Geometry | 不提供 LowPoly、Sketch；正面图加最多七张不同角度图 |
| `hy-3d-express` | 文生、图生3D | 可选 PBR 或白模；不提供多视图及自定义面数 |

| 方法和路径 | 用途 |
| --- | --- |
| `POST /v1/videos` | OpenAI 视频创建；支持 `prompt`、`seconds`、`size`、`input_reference` 及混元视频字段 |
| `GET /v1/videos/{task_id}` | 宿主 OpenAI 视频状态 |
| `GET /v1/videos/{task_id}/content` | 宿主视频下载 |
| `POST /v1/wand/hunyuan-video/generation` | 原生视频提交 |
| `GET /v1/wand/hunyuan-video/tasks/{task_id}` | 原生视频查询 |
| `POST /v1/api/3d/submit` | 原生3D提交 |
| `POST /v1/api/3d/query` | 原生3D查询，请求体 `{"id":"网关任务ID","model":"hy-3d-3.1"}`；返回状态，文件 URL 为空 |
| `GET /v1/api/3d/query?id=网关任务ID` | 3D查询，返回文件和预览图的网关下载地址 |

原生路径也可加 `/byaiden_hunyuan` 前缀，例如 `/byaiden_hunyuan/v1/api/3d/submit`。原生响应中的任务 ID 均替换为网关 ID，结果 URL 替换为网关产物地址。3D文件与预览图通过宿主任务产物接口获取。查询必须使用 new-api 返回的 ID；3D查询所用模型以保存的任务为准。

## 请求示例

文生视频：

```bash
curl https://NEW_API_HOST/v1/videos \
  -H 'Authorization: Bearer NEW_API_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"model":"hy-video-v1.5","prompt":"一艘小船驶过平静的湖面","seconds":"5","size":"1280x720"}'
```

图生视频可在 `input_reference` 传 HTTP(S) 图片 URL、JPEG/PNG Base64 data URL，或通过 multipart 上传不超过 10 MiB 的图片。原生接口使用 `image_url` 或 `image`。图片输入不能与 `size`／`aspect_ratio` 同时使用。可选 `negative_prompt`、`revise`、`moderation`、整数 `seed`、最多 16 个非空白字符的水印 `footnote`。只支持 `n=1`，显式发送 5 秒和 720p。

3D生成：

```bash
curl https://NEW_API_HOST/byaiden_hunyuan/v1/api/3d/submit \
  -H 'Authorization: Bearer NEW_API_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"model":"hy-3d-3.1","prompt":"一只小陶瓷猫","enable_pbr":true}'
```

`prompt`、`image_url`、`image_base64` 三选一，提示词最多 1024 字符。3.0 的 Sketch 模式需要图片，也允许同时填写提示词。多视图需提供正面图片，并填写 `multi_view_images`，各项包含唯一 `view_type` 与 `view_image_url`；视角为 `left`、`right`、`back`、`top`、`bottom`、`left_front`、`right_front`。

专业版可选 `generate_type`（默认 Normal，或 LowPoly／Geometry／Sketch）、`enable_pbr`、`face_count`（3000–1500000，LowPoly 不适用）、`polygon_type`（triangle／quadrilateral，仅 LowPoly）及 `result_format`（stl／usdz／fbx）。省略格式返回厂商默认 OBJ／GLB 文件组。极速版可选 `enable_pbr`、`enable_geometry`、`result_format`（obj／glb／stl／usdz／fbx／mp4）；白模不能同时选择 PBR 或 OBJ。未列出的字段（包括 `callback_url`、`file_id`）均拒绝。

## 计费

用量只报告事实，不包含金额。视频预扣 `video_tokens=150000`（5 秒 × 30000 tokens/秒）；完成后使用 `tokenhub_usage.total_tokens` 结算，上限 150000，缺失或为零则保留预扣。`billing_ratios` 返回 null。3D 按官方选项表预扣 `credits`；当前查询文档没有用量字段，完成后保留预扣。

2026-11-12 核验的官方定价是**人民币**：视频 10 元/百万 tokens，3D 0.12 元/积分。以下表达式直接使用人民币标价数字，适用于「1 元 = 1 美元额度」的站点；站点按美元结算时，在表达式末尾再除以你的汇率（例如 `/ 7`）。new-api quota = 表达式结果 × 500000。

| 模型 | 推荐 `tiered_expr`（人民币标价数字） |
| --- | --- |
| `hy-video-v1.5` | `tier("base", u("video_tokens") * 10 / 1000000)` |
| `hy-3d-3.0` | `tier("base", u("credits") * 0.12)` |
| `hy-3d-3.1` | `tier("base", u("credits") * 0.12)` |
| `hy-3d-express` | `tier("base", u("credits") * 0.12)` |

专业版基础积分：Normal 20、LowPoly 25、Geometry 15、Sketch 25；多视图 +10、PBR +10、显式传自定义 `face_count` +10、额外 `result_format` +5。极速版基础 15，PBR +10。若使用默认 500000 面且不想选择自定义面数选项，请省略 `face_count`。不适用的选项组合在提交前拒绝。失败任务由宿主退款。不计算免费额度、资源包折扣或账户优惠。

按上述表达式，单个视频预扣 1.5（750000 quota）；普通专业版 2.4（1200000 quota）；极速版 1.8（900000 quota）。表达式配置在对应插件／模型组合下；异步结算可能产生单独的差额日志。

## 经由另一个 New API 网关

另一个网关可以通过你的网关转售混元。两个网关都要安装本插件的同一版本：

- 直接调用 TokenHub 的网关按上文创建任务插件渠道。
- 另一个网关创建 **New API** 渠道（类型 60）：Base URL 填第一个网关的地址，密钥填第一个网关的令牌，在「上游任务插件」中选择 `byaiden_hunyuan`，并添加模型。

外层网关把 TokenHub 原生请求发到第一个网关的 `/byaiden_hunyuan/...` 路径，用令牌作为 Bearer 密钥，并在那里轮询：视频用 `GET /byaiden_hunyuan/v1/wand/hunyuan-video/tasks/{task_id}`，3D 用 `GET /byaiden_hunyuan/v1/api/3d/query?id=`。结果通过第一个网关的下载地址取回，请把它的服务器地址（`ServerAddress`）设成外层网关能访问的地址。每个网关用自己的任务表达式向自己的用户计费，上面的表达式在两个网关上都适用。

- 视频在两个网关上都按 TokenHub 报告的 token 数结算：第一个网关的视频查询现在会带上 `tokenhub_usage.total_tokens`。
- 3D 任务在两个网关上都保持预扣积分，与以前相同。

## 限制与验证范围

- 需要 new-api v1.0.0-rc.50 或更新版本。`npm test` 运行离线测试；`test/golden.json` 在真实宿主重放顶层 hooks。
- 开发过程未使用真实密钥，未调用任何生成接口。离线验证不能证明账户访问权限、真实文件下载或生产计费。
- 当前视频 ID 为 `hy-video-v1.5`，不提供已于 2026 年 9 月下线的 `hy-video-1.5`。旧腾讯云产品文档已提示向 TokenHub 迁移。
- 3D任务 ID 有效期 24 小时。视频下载通过 GET 刷新临时 URL，失败时回退到最近轮询结果。3D查询是 POST，内容 hooks 的 `utils.fetch` 不允许 POST，因此3D下载使用最后一次轮询的 URL；请及时下载并自行持久化。
- 商用前应通过实际账户确认专业版默认行为、3.0 附加视角兼容性、显式传默认面数的积分行为。3.1 当前能力列表未列 Sketch，本插件保守禁用。
- 远程图片的大小、分辨率由调用方确保符合官方文档，最终由厂商校验。未知状态返回 UNKNOWN，成功但没有可用产物时判定失败。
- 本版不含取消任务、音频产物、生图或3D后处理。重复提交可能产生重复计费。

## 官方资料

- [混元生视频调用指南](https://cloud.tencent.com/document/product/1823/137202)
- [混元生3D专业版指南](https://cloud.tencent.com/document/product/1823/137181)
- [混元生3D极速版指南](https://cloud.tencent.com/document/product/1823/137175)
- [TokenHub 模型价格](https://cloud.tencent.com/document/product/1823/130055)
- [3D积分扣减说明](https://cloud.tencent.com/document/product/1804/123461)
- [旧版视觉模型迁移](https://cloud.tencent.com/document/product/1823/135600)

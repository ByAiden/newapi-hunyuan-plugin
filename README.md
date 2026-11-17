---
translations:
  zh-CN: README.zh-CN.md
---
# Tencent Hunyuan Video & 3D

**English** | [简体中文](README.zh-CN.md)

A new-api Task Plugin API v1 plugin for Tencent Cloud TokenHub: Hunyuan text/image to video and text/image/multi-view to 3D.

## Channel setup

1. Upload `plugin.js`, enable the plugin and activate the uploaded version.
2. Create a **Task Plugin** channel (type 61), and bind `byaiden_hunyuan`.
3. Paste an API key created in [TokenHub API Key management](https://console.cloud.tencent.com/tokenhub/apikey) into the channel key field. Enable the required models and postpaid access in TokenHub.
4. Leave the base URL empty to use `https://tokenhub.tencentmaas.com`, or enter that address without `/v1`. Add the model IDs below to the channel.
5. Configure each model's `tiered_expr` billing expression as described below.

Clients authenticate to new-api using `Authorization: Bearer NEW_API_TOKEN`. Upstream authentication is the TokenHub API key. Tencent Cloud SecretId/SecretKey credentials for the older `vclm.tencentcloudapi.com` and `ai3d.tencentcloudapi.com` APIs do not work here. This plugin uses Tencent Cloud's current TokenHub surface; it does not implement TC3 signing or an external proxy.

## Models and endpoints

| Model | Capabilities | Restrictions |
| --- | --- | --- |
| `hy-video-v1.5` | Text/image to video | One 5-second 720p output; text aspect ratios 16:9, 9:16, 1:1, 4:3, 3:4; image sets its own aspect ratio |
| `hy-3d-3.0` | Text/image/multi-view to 3D, Normal, LowPoly, Geometry, Sketch | PBR, custom face count, optional output format |
| `hy-3d-3.1` | Text/image/multi-view to 3D, Normal, Geometry | LowPoly and Sketch disabled; up to seven additional named views plus front |
| `hy-3d-express` | Text/image to 3D | Optional PBR or geometry-only output; no multi-view or custom face count |

| Method and path | Purpose |
| --- | --- |
| `POST /v1/videos` | OpenAI video create: `prompt`, `seconds`, `size`, `input_reference`, plus documented Hunyuan video fields |
| `GET /v1/videos/{task_id}` | Host OpenAI video status |
| `GET /v1/videos/{task_id}/content` | Host video download |
| `POST /v1/wand/hunyuan-video/generation` | TokenHub native video submit |
| `GET /v1/wand/hunyuan-video/tasks/{task_id}` | Native video status |
| `POST /v1/api/3d/submit` | Native 3D submit |
| `POST /v1/api/3d/query` | Native 3D query, body `{"id":"GATEWAY_TASK_ID","model":"hy-3d-3.1"}`. Reports the status; file URLs are empty |
| `GET /v1/api/3d/query?id=GATEWAY_TASK_ID` | 3D query with the gateway download addresses of the files and previews |

Native routes also work under `/byaiden_hunyuan`, for example `/byaiden_hunyuan/v1/api/3d/submit`. Native replies replace vendor IDs with gateway task IDs, and output URLs with gateway artifact URLs. 3D files and preview images are listed as host task artifacts. Use the IDs returned by new-api when querying. The 3D query model is taken from the saved task, not trusted from the client.

## Requests

Text to video:

```bash
curl https://NEW_API_HOST/v1/videos \
  -H 'Authorization: Bearer NEW_API_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"model":"hy-video-v1.5","prompt":"A boat crossing a quiet lake","seconds":"5","size":"1280x720"}'
```

Image to video accepts an HTTP(S) image URL or JPEG/PNG base64 data URL in `input_reference`. Multipart `input_reference` uploads are supported and limited to 10 MiB. Native video requests use `image_url` or `image` (base64). Images and `size`/`aspect_ratio` cannot be combined. Native options include `negative_prompt`, `revise`, `moderation`, integer `seed`, and a watermark `footnote` up to 16 non-whitespace characters. Only `n=1` is supported; duration and resolution are sent explicitly as 5 and 720p.

3D generation:

```bash
curl https://NEW_API_HOST/byaiden_hunyuan/v1/api/3d/submit \
  -H 'Authorization: Bearer NEW_API_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"model":"hy-3d-3.1","prompt":"A small ceramic cat","enable_pbr":true}'
```

Send exactly one of `prompt`, `image_url`, or `image_base64`, except 3.0 Sketch mode which requires an image and may also include a prompt. Prompts are limited to 1024 characters. Multi-view requests require a front image plus `multi_view_images` containing unique `view_type` values: `left`, `right`, `back`, `top`, `bottom`, `left_front`, `right_front`, each with `view_image_url`.

Pro options: `generate_type` (Normal default; LowPoly/Geometry/Sketch), `enable_pbr`, `face_count` (3000–1500000, unavailable for LowPoly), `polygon_type` (triangle/quadrilateral, LowPoly only), and `result_format` (stl/usdz/fbx). Omit `result_format` to receive the vendor's default OBJ/GLB group. Express options: `enable_pbr`, `enable_geometry`, `result_format` (obj/glb/stl/usdz/fbx/mp4); geometry-only excludes PBR and OBJ. All unrecognized fields, including `callback_url` and `file_id`, are rejected.

## Billing

Usage fields contain facts, never money. Video reserves `video_tokens=150000` (5 seconds × 30,000 tokens/second); completion settles from `tokenhub_usage.total_tokens`, capped at 150000. Missing/zero usage keeps the reservation. `billing_ratios` returns null. 3D reserves `credits` from the official option table and keeps that reservation because the documented 3D query response has no usage field.

Official prices checked on 2026-11-12 are **CNY**, not USD: video CNY 10 per million tokens; 3D CNY 0.12 per credit. For an explicit example conversion of **7 CNY = 1 USD**, use the following USD-returning expressions. Replace `7` with your chosen CNY-per-USD conversion rate; these are converted list prices, not an official Tencent USD price or a live exchange quote. new-api quota = returned USD × 500000.

| Model | Recommended `tiered_expr` expression at the example exchange rate |
| --- | --- |
| `hy-video-v1.5` | `tier("base", u("video_tokens") * 10 / 1000000 / 7)` |
| `hy-3d-3.0` | `tier("base", u("credits") * 0.12 / 7)` |
| `hy-3d-3.1` | `tier("base", u("credits") * 0.12 / 7)` |
| `hy-3d-express` | `tier("base", u("credits") * 0.12 / 7)` |

3D base credits: Normal 20, LowPoly 25, Geometry 15, Sketch 25; add 10 for multi-view, 10 for PBR, 10 when a custom `face_count` is supplied, and 5 for an explicit Pro `result_format`. Express is 15 plus 10 for PBR. Omit `face_count` to use the vendor's 500000 default without requesting the custom-face option. Invalid or ignored option combinations are rejected before submitting. Failed tasks are refunded by the host. Resource pack discounts, free allowances and account-specific prices are not reflected.

At this example rate, one video reserves USD 0.2142857 (about 107143 quota), Normal 3D USD 0.3428571 (about 171429 quota), Express USD 0.2571429 (about 128571 quota). Configure expressions under the selected plugin/model pair; async settlement may appear as a separate delta log.

## Through another New API gateway

A second gateway can sell Hunyuan through yours. Install this plugin, at the same version, on both gateways:

- On the gateway that calls TokenHub, set up the Task Plugin channel above.
- On the other gateway, create a **New API** channel (type 60). Its base URL is the first gateway's address and its key is a token from the first gateway. Pick `byaiden_hunyuan` under Upstream task plugins and add the models.

The outer gateway sends TokenHub's own requests to the first gateway's `/byaiden_hunyuan/...` paths with the token as a Bearer key and polls them there: videos at `GET /byaiden_hunyuan/v1/wand/hunyuan-video/tasks/{task_id}`, 3D jobs at `GET /byaiden_hunyuan/v1/api/3d/query?id=`. Outputs download through the first gateway's download addresses, so set its server address (`ServerAddress`) to an address the outer gateway can reach. Each gateway bills its own users with its own task expressions; the expressions above work on both.

- Video settles on the tokens TokenHub reports, on both gateways: the first gateway's video query now passes on `tokenhub_usage.total_tokens`.
- 3D jobs keep the reserved credits on both gateways, as before.

## Limits and verification

- Requires new-api v1.0.0-rc.50 or newer. `npm test` exercises offline hooks; `test/golden.json` replays exported hooks in the real host.
- No live vendor credentials were used. No generation endpoint was called during development. Offline tests do not prove account access, actual media downloads or production billing.
- TokenHub's current video model ID is `hy-video-v1.5`. The retired `hy-video-1.5` is deliberately excluded. The older Tencent Cloud product pages announce migration to TokenHub.
- 3D job IDs are valid for 24 hours. Video downloads refresh signed URLs with a GET and fall back to the last poll; 3D query uses POST, unavailable to `utils.fetch` in content hooks, so 3D downloads use the last poll's URL. Download promptly and retain permanent copies separately.
- Pro defaults, additional-view compatibility on 3.0, and explicit default face-count credit behavior should be confirmed against an actual account before commercial use. This plugin conservatively excludes Sketch on 3.1 because its current model capability list does not include it.
- Image size/dimension rules remain the caller's responsibility for remote URLs; vendor validation remains authoritative. See the linked API guides for exact limits. Unknown upstream states become UNKNOWN, and successful envelopes without usable output fail.
- Cancellation, audio artifacts, image generation, and 3D postprocessing are outside this release. Retries can create duplicate billable tasks.

## Official references

- [Hunyuan video guide](https://cloud.tencent.com/document/product/1823/137202)
- [Hunyuan 3D Pro guide](https://cloud.tencent.com/document/product/1823/137181)
- [Hunyuan 3D Express guide](https://cloud.tencent.com/document/product/1823/137175)
- [TokenHub model prices](https://cloud.tencent.com/document/product/1823/130055)
- [3D credit deductions](https://cloud.tencent.com/document/product/1804/123461)
- [Retired visual model migration](https://cloud.tencent.com/document/product/1823/135600)

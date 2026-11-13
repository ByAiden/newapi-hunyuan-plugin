export const meta = {
  "apiVersion": 1,
  "key": "byaiden_hunyuan",
  "name": "Tencent Hunyuan Video & 3D (TokenHub)",
  "icon": "Hunyuan.Color",
  "description": {
    "en": "Tencent Hunyuan video generation (HY-Video 1.5, text and image to video) and Hunyuan 3D generation (HY-3D 3.0, 3.1 and Express, text, image and multi-view to 3D) through Tencent Cloud TokenHub",
    "zh": "腾讯混元生视频（HY-Video 1.5，文生视频、图生视频）与混元生3D（HY-3D 3.0、3.1、极速版，文生、图生、多视图生3D），通过腾讯云 TokenHub 调用"
  },
  "version": "1.0.1",
  "author": { "name": "ByAiden", "url": "https://github.com/ByAiden" },
  "website": "https://cloud.tencent.com/document/product/1823/137202",
  "baseUrl": "https://tokenhub.tencentmaas.com",
  "models": ["hy-video-v1.5", "hy-3d-3.0", "hy-3d-3.1", "hy-3d-express"],
  "fetchMode": "per_task",
  "keyHint": { "en": "TokenHub API key", "zh": "TokenHub API Key" },
  "usageSchema": {
    "video_tokens": {
      "type": "number",
      "unit": "token",
      "description": { "en": "Video generation token unit price", "zh": "视频生成 token 单价" }
    }
  },
  "usageExamples": [
    { "label": "5s 720p", "facts": { "video_tokens": 150000 } }
  ],
  "usageProfiles": [
    {
      "models": ["hy-3d-3.0", "hy-3d-3.1", "hy-3d-express"],
      "schema": {
        "credits": {
          "type": "number",
          "unit": "credit",
          "description": { "en": "3D generation credit unit price", "zh": "3D 生成积分单价" }
        }
      },
      "examples": [
        { "label": "Express", "facts": { "credits": 15 } },
        { "label": "Normal", "facts": { "credits": 20 } },
        { "label": "LowPoly with PBR", "facts": { "credits": 35 } },
        { "label": "Normal with all options", "facts": { "credits": 55 } }
      ]
    }
  ],
  "routes": [
    {
      "method": "POST",
      "path": "/v1/wand/hunyuan-video/generation",
      "type": "submit",
      "decode": "createVideo",
      "render": "videoCreated",
      "models": ["hy-video-v1.5"]
    },
    {
      "method": "GET",
      "path": "/v1/wand/hunyuan-video/tasks/:task_id",
      "type": "query",
      "taskIdParam": "task_id",
      "render": "videoTask"
    },
    {
      "method": "POST",
      "path": "/v1/api/3d/submit",
      "type": "submit",
      "decode": "create3D",
      "render": "jobCreated",
      "models": ["hy-3d-3.0", "hy-3d-3.1", "hy-3d-express"]
    },
    {
      "method": "POST",
      "path": "/v1/api/3d/query",
      "type": "dynamic",
      "decode": "query3D",
      "render": "jobStatus"
    }
  ],
  "protocols": [{ "name": "openai_video", "models": ["hy-video-v1.5"] }]
};

// The gateway reads the manifest statically, so the code below uses these copies of its values.
const MODEL_IDS = ["hy-video-v1.5","hy-3d-3.0","hy-3d-3.1","hy-3d-express"];

// TokenHub (Tencent Cloud's model gateway) serves Hunyuan with a Bearer API key:
// video https://cloud.tencent.com/document/product/1823/137202
// 3D    https://cloud.tencent.com/document/product/1823/137181 (3.0 and 3.1)
//       https://cloud.tencent.com/document/product/1823/137175 (Express)
const DEFAULT_BASE = "https://tokenhub.tencentmaas.com";
const VIDEO_MODELS = ["hy-video-v1.5"];
const PRO_3D_MODELS = ["hy-3d-3.0", "hy-3d-3.1"];
const EXPRESS_3D_MODELS = ["hy-3d-express"];

// HY-Video 1.5 renders 5 seconds of 720p; TokenHub counts 30,000 tokens per
// second of video.
const VIDEO_SECONDS = 5;
const VIDEO_RESOLUTION = "720p";
const VIDEO_TOKENS_PER_SECOND = 30000;
const VIDEO_TOKENS = VIDEO_SECONDS * VIDEO_TOKENS_PER_SECOND;
const VIDEO_RATIOS = ["16:9", "9:16", "1:1", "4:3", "3:4"];
// OpenAI sizes and the aspect ratio they stand for.
const VIDEO_SIZES = {
  "1280x720": "16:9",
  "720x1280": "9:16",
  "720x720": "1:1",
  "960x720": "4:3",
  "720x960": "3:4",
};
const VIDEO_FIELDS = ["model", "prompt", "negative_prompt", "image", "image_url", "n", "duration", "aspect_ratio", "resolution", "revise", "moderation", "seed", "footnote"];
const VIDEO_IMAGE_TYPES = ["image/jpeg", "image/png"];
const VIDEO_IMAGE_BYTES = 10 * 1024 * 1024;

// 3D credits, from the Hunyuan 3D billing page
// (https://cloud.tencent.com/document/product/1804/123461); TokenHub bills the
// same credits.
const PRO_BASE_CREDITS = { Normal: 20, LowPoly: 25, Geometry: 15, Sketch: 25 };
const PRO_MULTI_VIEW_CREDITS = 10;
const PRO_PBR_CREDITS = 10;
const PRO_FACE_COUNT_CREDITS = 10;
const PRO_FORMAT_CREDITS = 5;
const EXPRESS_BASE_CREDITS = 15;
const EXPRESS_PBR_CREDITS = 10;
const PRO_FIELDS = ["model", "prompt", "image_base64", "image_url", "multi_view_images", "enable_pbr", "face_count", "generate_type", "polygon_type", "result_format"];
const EXPRESS_FIELDS = ["model", "prompt", "image_base64", "image_url", "result_format", "enable_pbr", "enable_geometry"];
const PRO_FORMATS = ["stl", "usdz", "fbx"];
const EXPRESS_FORMATS = ["obj", "glb", "stl", "usdz", "fbx", "mp4"];
const VIEW_TYPES = ["left", "right", "back", "top", "bottom", "left_front", "right_front"];
const POLYGON_TYPES = ["triangle", "quadrilateral"];
const PROMPT_3D_MAX = 1024;
const FILE_TYPES = {
  obj: "application/zip",
  glb: "model/gltf-binary",
  stl: "model/stl",
  usdz: "model/vnd.usdz+zip",
  fbx: "application/octet-stream",
  mp4: "video/mp4",
  gif: "image/gif",
};

function trimmed(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function plainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function present(value) {
  return value !== undefined && value !== null && value !== "";
}

function modelOf(ctx) {
  return trimmed(ctx.upstreamModel || ctx.model);
}

function isVideoModel(model) {
  return VIDEO_MODELS.includes(model);
}

function is3DModel(model) {
  return PRO_3D_MODELS.includes(model) || EXPRESS_3D_MODELS.includes(model);
}

// A task built for a video model has a task_id; a 3D job has an id.
function isVideoTask(ctx, data) {
  const model = modelOf(ctx);
  if (isVideoModel(model)) return true;
  if (is3DModel(model)) return false;
  const body = plainObject(data) || {};
  return present(body.task_id) || Array.isArray(body.videos);
}

function baseUrl(ctx) {
  return trimmed(ctx.baseUrl).replace(/\/+$/, "") || DEFAULT_BASE;
}

function requestHeaders(ctx) {
  return { "Content-Type": "application/json", Accept: "application/json", Authorization: ctx.authHeader || "Bearer " + trimmed(ctx.apiKey) };
}

function httpURL(value) {
  return /^https?:\/\/[^\s]+$/i.test(trimmed(value));
}

function boolField(body, name) {
  if (body[name] !== undefined && typeof body[name] !== "boolean") throw new Error(name + " must be true or false");
}

function vendorError(body) {
  const error = plainObject(body && body.error);
  if (error && trimmed(error.message)) return trimmed(error.message) + (trimmed(error.code) ? " (" + trimmed(error.code) + ")" : "");
  if (body && typeof body.error === "string" && trimmed(body.error)) return trimmed(body.error);
  if (body && trimmed(body.message)) return trimmed(body.message);
  return "";
}

// ---- Video ----

// A data URL of a JPEG or PNG image, the form TokenHub takes; bare base64 is
// recognized by its leading bytes.
function videoImage(value) {
  if (plainObject(value) && value.__fileRef) return value;
  const text = trimmed(value);
  if (!text) throw new Error("image is empty");
  let mime = "";
  let data = text;
  if (text.startsWith("data:")) {
    const comma = text.indexOf(",");
    if (comma < 0 || !text.slice(0, comma).endsWith(";base64")) throw new Error("image must be a base64 data URL");
    mime = text.slice(5, comma).split(";")[0].toLowerCase();
    data = text.slice(comma + 1);
  } else if (text.startsWith("iVBORw0KGgo")) mime = "image/png";
  else if (text.startsWith("/9j/")) mime = "image/jpeg";
  if (mime === "image/jpg") mime = "image/jpeg";
  if (!VIDEO_IMAGE_TYPES.includes(mime)) throw new Error("image must be a JPEG or PNG image");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) throw new Error("image must be base64 data");
  return "data:" + mime + ";base64," + data;
}

// The normalized body of a video request; every field is checked here, so the
// native route and /v1/videos send the same request.
function videoRequest(body, model) {
  for (const key of Object.keys(body)) {
    if (!VIDEO_FIELDS.includes(key)) throw new Error(key + " is not supported by " + model);
  }
  const out = { model: model };
  const prompt = trimmed(body.prompt);
  const hasImage = present(body.image);
  const hasURL = present(body.image_url);
  if (hasImage && hasURL) throw new Error("image and image_url cannot both be set");
  if (!prompt && !hasImage && !hasURL) throw new Error("prompt is required for text to video");
  if (body.prompt !== undefined && typeof body.prompt !== "string") throw new Error("prompt must be a string");
  if (prompt) out.prompt = prompt;
  if (present(body.negative_prompt)) {
    if (typeof body.negative_prompt !== "string") throw new Error("negative_prompt must be a string");
    out.negative_prompt = body.negative_prompt;
  }
  if (hasImage) out.image = videoImage(body.image);
  if (hasURL) {
    if (!httpURL(body.image_url)) throw new Error("image_url must be an http or https URL");
    out.image_url = trimmed(body.image_url);
  }
  if (present(body.n) && ![1, "1"].includes(body.n)) throw new Error("n must be 1");
  if (present(body.duration) && (!["number", "string"].includes(typeof body.duration) || Math.trunc(Number(body.duration)) !== VIDEO_SECONDS)) throw new Error("duration must be 5: " + model + " renders 5 seconds");
  if (present(body.resolution) && trimmed(body.resolution).toLowerCase() !== VIDEO_RESOLUTION) throw new Error("resolution must be 720p: " + model + " renders 720p");
  if (present(body.aspect_ratio)) {
    if (hasImage || hasURL) throw new Error("aspect_ratio applies to text to video only; the input image sets the frame");
    if (!VIDEO_RATIOS.includes(trimmed(body.aspect_ratio))) throw new Error("aspect_ratio must be one of " + VIDEO_RATIOS.join(", "));
    out.aspect_ratio = trimmed(body.aspect_ratio);
  }
  boolField(body, "revise");
  boolField(body, "moderation");
  if (body.revise !== undefined) out.revise = body.revise;
  if (body.moderation !== undefined) out.moderation = body.moderation;
  if (present(body.seed)) {
    if (!Number.isInteger(body.seed)) throw new Error("seed must be an integer");
    out.seed = body.seed;
  }
  if (present(body.footnote)) {
    if (typeof body.footnote !== "string") throw new Error("footnote must be a string");
    if ([...body.footnote.replace(/\s/g, "")].length > 16) throw new Error("footnote must be at most 16 characters");
    out.footnote = body.footnote;
  }
  // Price-determining values are always sent, so the render matches the
  // reservation.
  out.duration = VIDEO_SECONDS;
  out.resolution = VIDEO_RESOLUTION;
  return out;
}

function videoIntent(model, requestBody) {
  const image = present(requestBody.image) || present(requestBody.image_url);
  return { kind: "submit", model: model, action: image ? "image_to_video" : "text_to_video", requestBody: requestBody };
}

function firstVideoURL(data) {
  const videos = Array.isArray((plainObject(data) || {}).videos) ? data.videos : [];
  for (const video of videos) {
    if (plainObject(video) && httpURL(video.url)) return trimmed(video.url);
  }
  return "";
}

function videoTaskURL(ctx, id) {
  return baseUrl(ctx) + "/v1/wand/hunyuan-video/tasks/" + encodeURIComponent(id);
}

function videoTaskResult(body) {
  const data = plainObject(body);
  const status = trimmed(data && data.status).toLowerCase();
  if (status === "queued") return { status: "QUEUED", progress: "10%" };
  if (status === "running") return { status: "IN_PROGRESS", progress: "50%" };
  if (status === "succeeded") {
    return firstVideoURL(data) ? { status: "SUCCESS", progress: "100%" } : { status: "FAILURE", progress: "100%", reason: "Hunyuan returned no video" };
  }
  if (status === "failed") return { status: "FAILURE", progress: "100%", reason: vendorError(data) || "video generation failed" };
  return { status: "UNKNOWN", reason: "unrecognized status: " + status };
}

// ---- 3D ----

function rawBase64(value, name) {
  let text = trimmed(value);
  if (text.startsWith("data:")) {
    const comma = text.indexOf(",");
    const mime = text.slice(5, comma).split(";")[0].toLowerCase();
    if (comma < 0 || !["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(mime)) throw new Error(name + " must be a JPEG, PNG or WebP image");
    text = text.slice(comma + 1);
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(text)) throw new Error(name + " must be base64 data");
  return text;
}

function multiViews(value) {
  if (!Array.isArray(value) || !value.length) throw new Error("multi_view_images must be a non-empty array");
  const seen = [];
  return value.map(function (item, index) {
    const view = plainObject(item);
    if (!view) throw new Error("multi_view_images[" + index + "] must be an object");
    for (const key of Object.keys(view)) {
      if (key !== "view_type" && key !== "view_image_url") throw new Error("multi_view_images[" + index + "]." + key + " is not supported");
    }
    const type = trimmed(view.view_type);
    if (!VIEW_TYPES.includes(type)) throw new Error("multi_view_images[" + index + "].view_type must be one of " + VIEW_TYPES.join(", "));
    if (seen.includes(type)) throw new Error("multi_view_images holds one image per view; " + type + " is repeated");
    seen.push(type);
    if (!httpURL(view.view_image_url)) throw new Error("multi_view_images[" + index + "].view_image_url must be an http or https URL");
    return { view_type: type, view_image_url: trimmed(view.view_image_url) };
  });
}

// The normalized body of a 3D request. Every documented field is checked, as
// each option changes the credits the job costs.
function threeDRequest(body, model) {
  const express = EXPRESS_3D_MODELS.includes(model);
  const fields = express ? EXPRESS_FIELDS : PRO_FIELDS;
  for (const key of Object.keys(body)) {
    if (!fields.includes(key)) throw new Error(key + " is not supported by " + model);
  }
  const out = { model: model };
  const generateType = express ? "" : present(body.generate_type) ? trimmed(body.generate_type) : "Normal";
  if (!express) {
    if (!PRO_BASE_CREDITS[generateType]) throw new Error("generate_type must be one of " + Object.keys(PRO_BASE_CREDITS).join(", "));
    if (model === "hy-3d-3.1" && (generateType === "LowPoly" || generateType === "Sketch")) throw new Error("generate_type " + generateType + " is not available on hy-3d-3.1; use hy-3d-3.0");
  }
  if (body.prompt !== undefined && typeof body.prompt !== "string") throw new Error("prompt must be a string");
  const prompt = trimmed(body.prompt);
  const hasBase64 = present(body.image_base64);
  const hasURL = present(body.image_url);
  if (hasBase64 && hasURL) throw new Error("image_base64 and image_url cannot both be set");
  const hasImage = hasBase64 || hasURL;
  if (generateType === "Sketch") {
    if (!hasImage) throw new Error("generate_type Sketch needs a sketch image in image_url or image_base64");
  } else {
    if (!prompt && !hasImage) throw new Error("prompt, image_url or image_base64 is required");
    if (prompt && hasImage) throw new Error("prompt cannot be combined with an image; send one of them");
  }
  if (prompt) {
    if ([...prompt].length > PROMPT_3D_MAX) throw new Error("prompt must be at most 1024 characters");
    out.prompt = prompt;
  }
  if (hasBase64) out.image_base64 = rawBase64(body.image_base64, "image_base64");
  if (hasURL) {
    if (!httpURL(body.image_url)) throw new Error("image_url must be an http or https URL");
    out.image_url = trimmed(body.image_url);
  }
  boolField(body, "enable_pbr");
  if (body.enable_pbr !== undefined) out.enable_pbr = body.enable_pbr;
  if (express) {
    boolField(body, "enable_geometry");
    if (body.enable_geometry !== undefined) out.enable_geometry = body.enable_geometry;
    if (body.enable_geometry === true && body.enable_pbr === true) throw new Error("enable_pbr does not apply to a geometry-only model");
    if (present(body.result_format)) {
      const format = trimmed(body.result_format).toLowerCase();
      if (!EXPRESS_FORMATS.includes(format)) throw new Error("result_format must be one of " + EXPRESS_FORMATS.join(", "));
      if (format === "obj" && body.enable_geometry === true) throw new Error("a geometry-only model cannot be returned as obj");
      out.result_format = format;
    }
    return out;
  }
  if (present(body.generate_type)) out.generate_type = generateType;
  if (body.enable_pbr === true && generateType === "Geometry") throw new Error("enable_pbr does not apply to generate_type Geometry");
  if (present(body.multi_view_images)) {
    if (!hasImage) throw new Error("multi_view_images needs the front view in image_url or image_base64");
    out.multi_view_images = multiViews(body.multi_view_images);
  }
  if (present(body.face_count)) {
    if (generateType === "LowPoly") throw new Error("face_count does not apply to generate_type LowPoly");
    if (!Number.isInteger(body.face_count) || body.face_count < 3000 || body.face_count > 1500000) throw new Error("face_count must be an integer from 3000 to 1500000");
    out.face_count = body.face_count;
  }
  if (present(body.polygon_type)) {
    if (generateType !== "LowPoly") throw new Error("polygon_type applies to generate_type LowPoly only");
    if (!POLYGON_TYPES.includes(trimmed(body.polygon_type))) throw new Error("polygon_type must be one of " + POLYGON_TYPES.join(", "));
    out.polygon_type = trimmed(body.polygon_type);
  }
  if (present(body.result_format)) {
    const format = trimmed(body.result_format).toLowerCase();
    if (!PRO_FORMATS.includes(format)) throw new Error("result_format must be one of " + PRO_FORMATS.join(", "));
    out.result_format = format;
  }
  return out;
}

// The credits of a checked 3D request, per the published credit table.
function threeDCredits(req, model) {
  if (EXPRESS_3D_MODELS.includes(model)) return EXPRESS_BASE_CREDITS + (req.enable_pbr === true ? EXPRESS_PBR_CREDITS : 0);
  let credits = PRO_BASE_CREDITS[req.generate_type || "Normal"];
  if (req.multi_view_images) credits += PRO_MULTI_VIEW_CREDITS;
  if (req.enable_pbr === true) credits += PRO_PBR_CREDITS;
  if (present(req.face_count)) credits += PRO_FACE_COUNT_CREDITS;
  if (present(req.result_format)) credits += PRO_FORMAT_CREDITS;
  return credits;
}

function threeDAction(req) {
  if (req.generate_type === "Sketch") return "sketch_to_3d";
  if (req.multi_view_images) return "multi_view_to_3d";
  return present(req.image_url) || present(req.image_base64) ? "image_to_3d" : "text_to_3d";
}

function threeDQuery(ctx, id) {
  return { url: baseUrl(ctx) + "/v1/api/3d/query", method: "POST", headers: requestHeaders(ctx), body: { model: modelOf(ctx), id: id } };
}

function threeDFiles(data) {
  const items = Array.isArray((plainObject(data) || {}).data) ? data.data : [];
  const files = [];
  for (const item of items) {
    if (!plainObject(item)) continue;
    const type = trimmed(item.type).toLowerCase().replace(/[^a-z0-9]/g, "") || "file";
    let key = type;
    for (let n = 2; files.some((f) => f.key === key); n++) key = type + "_" + n;
    if (httpURL(item.url)) files.push({ key: key, type: type === "mp4" ? "video" : type === "gif" ? "image" : "file", mimeType: FILE_TYPES[type] || "application/octet-stream", url: trimmed(item.url), item: item, field: "url" });
    if (httpURL(item.preview_image_url)) files.push({ key: "preview_" + key, type: "image", mimeType: "image/png", url: trimmed(item.preview_image_url), item: item, field: "preview_image_url" });
  }
  return files;
}

function threeDTaskResult(body) {
  const data = plainObject(body);
  const status = trimmed(data && data.status).toLowerCase();
  if (status === "queued") return { status: "QUEUED", progress: "10%" };
  if (status === "in_progress") return { status: "IN_PROGRESS", progress: "50%" };
  if (status === "completed") {
    return threeDFiles(data).some((f) => f.field === "url") ? { status: "SUCCESS", progress: "100%" } : { status: "FAILURE", progress: "100%", reason: "Hunyuan returned no 3D file" };
  }
  if (status === "failed") return { status: "FAILURE", progress: "100%", reason: vendorError(data) || "3D generation failed" };
  return { status: "UNKNOWN", reason: "unrecognized status: " + status };
}

// ---- Driver hooks ----

function checkedRequest(ctx) {
  const model = modelOf(ctx);
  const body = plainObject(ctx.requestBody) || {};
  if (isVideoModel(model)) return { kind: "video", model: model, body: videoRequest(body, model) };
  if (is3DModel(model)) return { kind: "3d", model: model, body: threeDRequest(body, model) };
  throw new Error("unsupported model " + model + "; use " + MODEL_IDS.join(", "));
}

export function buildSubmitRequest(ctx) {
  const checked = checkedRequest(ctx);
  if (checked.kind === "video") {
    return { url: baseUrl(ctx) + "/v1/wand/hunyuan-video/generation", method: "POST", headers: requestHeaders(ctx), body: checked.body, action: ctx.action };
  }
  return { url: baseUrl(ctx) + "/v1/api/3d/submit", method: "POST", headers: requestHeaders(ctx), body: checked.body, action: threeDAction(checked.body) };
}

// TokenHub answers a rejected submission with 200 and a failed envelope.
export function parseSubmitResponse(ctx, response) {
  const body = plainObject(response.body) || {};
  const failure = trimmed(body.status).toLowerCase() === "failed" || plainObject(body.error);
  if (isVideoTask(ctx, body)) {
    const id = trimmed(body.task_id);
    if (failure || !id) throw new Error("Hunyuan rejected the video task: " + (vendorError(body) || "no task_id in the response"));
    return { taskId: id, taskData: body };
  }
  const id = trimmed(body.id);
  if (failure || !id) throw new Error("Hunyuan rejected the 3D job: " + (vendorError(body) || "no id in the response"));
  return { taskId: id, taskData: body };
}

export function extractUsage(ctx) {
  if (ctx.usagePurpose === "billing_ratios") return null;
  const checked = checkedRequest(ctx);
  if (checked.kind === "video") return { video_tokens: VIDEO_TOKENS };
  return { credits: threeDCredits(checked.body, checked.model) };
}

// Video settles on the tokens TokenHub reports, capped at the 5-second
// reservation. 3D jobs report no credits and keep the reservation.
export function extractUsageOnComplete(task, result, data) {
  if (result.status !== "SUCCESS" || !isVideoTask(task, data)) return null;
  const usage = plainObject((plainObject(data) || {}).tokenhub_usage);
  const tokens = usage ? Number(usage.total_tokens) : 0;
  if (!Number.isFinite(tokens) || tokens <= 0) return null;
  return { video_tokens: Math.min(tokens, VIDEO_TOKENS) };
}

export function buildQueryRequest(ctx) {
  if (isVideoTask(ctx, ctx.data)) return { url: videoTaskURL(ctx, ctx.taskId), method: "GET", headers: requestHeaders(ctx) };
  return threeDQuery(ctx, ctx.taskId);
}

export function parseTaskResult(ctx, body) {
  return isVideoTask(ctx, body) ? videoTaskResult(body) : threeDTaskResult(body);
}

export function listArtifacts(task) {
  if (task.status !== "SUCCESS") return [];
  if (isVideoTask(task, task.data)) return firstVideoURL(task.data) ? [{ key: "video", type: "video", mimeType: "video/mp4" }] : [];
  return threeDFiles(task.data).map(function (file) {
    return { key: file.key, type: file.type, mimeType: file.mimeType };
  });
}

// Video URLs are presigned, so a download reads the task again for a fresh
// one and falls back to the last poll. A 3D job is read with POST, which hooks
// cannot send, so its downloads use the URLs of the last poll (valid 24 hours).
export function buildContentRequest(ctx) {
  let url = "";
  if (isVideoTask(ctx, ctx.data)) {
    if (ctx.artifactKey !== "video") throw new Error("artifact_not_found");
    if (trimmed(ctx.upstreamTaskId)) {
      try {
        const response = utils.fetch({ url: videoTaskURL(ctx, ctx.upstreamTaskId), method: "GET", headers: { Accept: "application/json", Authorization: requestHeaders(ctx).Authorization } });
        if (response.status === 200) url = firstVideoURL(response.body);
      } catch (_error) {
        url = "";
      }
    }
    if (!url) url = firstVideoURL(ctx.data);
  } else {
    const file = threeDFiles(ctx.data).find((f) => f.key === ctx.artifactKey);
    url = file ? file.url : "";
  }
  if (!url) throw new Error("artifact_not_found");
  return { url: url, method: ctx.clientRequest.method, credentialless: true };
}

// ---- Native routes ----

function jsonBody(ctx) {
  if (!ctx.body || ctx.body.kind !== "json") throw new Error("JSON body required");
  const body = plainObject(ctx.body.value);
  if (!body) throw new Error("request body must be an object");
  return body;
}

const VENDOR_VIDEO_STATUS = { NOT_START: "queued", SUBMITTED: "queued", QUEUED: "queued", IN_PROGRESS: "running", SUCCESS: "succeeded", FAILURE: "failed" };
const VENDOR_3D_STATUS = { NOT_START: "queued", SUBMITTED: "queued", QUEUED: "queued", IN_PROGRESS: "in_progress", SUCCESS: "completed", FAILURE: "failed" };

function unixTime(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : undefined;
}

export const native = {
  createVideo: function (ctx) {
    const body = jsonBody(ctx);
    const model = trimmed(body.model);
    if (!model) throw new Error("model is required");
    return videoIntent(model, Object.assign({}, body, { model: model }));
  },
  videoCreated: function (ctx, task) {
    const data = plainObject(task.data) || {};
    return { task_id: task.task_id, created: unixTime(data.created) || unixTime(task.created_at), request_id: trimmed(data.request_id) };
  },
  // Hunyuan's task shape with the gateway's id and download address; account
  // usage stays out.
  videoTask: function (ctx, task) {
    const data = plainObject(task.data) || {};
    const out = { task_id: task.task_id, status: VENDOR_VIDEO_STATUS[task.status] || "queued", created: unixTime(data.created) || unixTime(task.created_at), error: null };
    if (task.status === "SUCCESS") {
      const artifact = ctx.artifacts && ctx.artifacts.video;
      const first = (Array.isArray(data.videos) ? data.videos : [])[0] || {};
      out.videos = [{ url: artifact ? artifact.url : "", audio_url: "", generate_info: trimmed(first.generate_info) }];
    }
    if (task.status === "FAILURE") {
      const error = plainObject(data.error);
      out.error = { code: trimmed(error && error.code) || "task_failed", message: task.fail_reason || vendorError(data) || "video generation failed" };
    }
    return out;
  },
  create3D: function (ctx) {
    const body = jsonBody(ctx);
    const model = trimmed(body.model);
    if (!model) throw new Error("model is required");
    const requestBody = Object.assign({}, body, { model: model });
    return { kind: "submit", model: model, action: is3DModel(model) ? threeDAction(threeDRequest(requestBody, model)) : "text_to_3d", requestBody: requestBody };
  },
  query3D: function (ctx) {
    const body = jsonBody(ctx);
    const id = trimmed(body.id);
    if (!id) throw new Error("id is required");
    return { kind: "query", taskIds: [id] };
  },
  jobCreated: function (ctx, task) {
    const data = plainObject(task.data) || {};
    return { id: task.task_id, object: "3d_job", created_at: unixTime(data.created_at) || unixTime(task.created_at), status: VENDOR_3D_STATUS[task.status] || "queued" };
  },
  jobStatus: function (ctx, task) {
    const data = plainObject(task.data) || {};
    const out = {
      id: task.task_id,
      object: "3d_job",
      status: VENDOR_3D_STATUS[task.status] || "queued",
      created_at: unixTime(data.created_at) || unixTime(task.created_at),
    };
    if (task.status === "SUCCESS") {
      out.completed_at = unixTime(data.completed_at) || unixTime(task.updated_at);
      const artifacts = ctx.artifacts || {};
      const entries = [];
      for (const file of threeDFiles(data)) {
        if (file.field !== "url") continue;
        const entry = { type: trimmed(file.item.type), url: artifacts[file.key] ? artifacts[file.key].url : "" };
        if (artifacts["preview_" + file.key]) entry.preview_image_url = artifacts["preview_" + file.key].url;
        entries.push(entry);
      }
      out.data = entries;
    }
    if (task.status === "FAILURE") out.error = { code: "task_failed", message: task.fail_reason || vendorError(data) || "3D generation failed" };
    return out;
  },
  error: function (ctx, error) {
    return { task_id: "", status: "failed", error: { code: error.code, message: error.message } };
  },
};

// ---- Client protocols ----

function videoSize(value) {
  const size = trimmed(value).toLowerCase();
  if (!VIDEO_SIZES[size]) throw new Error("size must be one of " + Object.keys(VIDEO_SIZES).join(", "));
  return VIDEO_SIZES[size];
}

export const protocols = {
  // OpenAI /v1/videos: prompt, seconds, size, input_reference, plus Hunyuan's
  // own fields at the top level.
  openai_video: {
    decodeRequest: function (ctx) {
      if (!ctx.body || (ctx.body.kind !== "json" && ctx.body.kind !== "multipart")) throw new Error("JSON or multipart body required");
      const req = {};
      let upload = null;
      if (ctx.body.kind === "json") {
        if (!plainObject(ctx.body.value)) throw new Error("JSON object required");
        Object.assign(req, ctx.body.value);
      } else {
        const fields = ctx.body.fields || {};
        for (const field of Object.keys(fields)) {
          if ((fields[field] || []).length > 1) throw new Error(field + " must be provided once");
          req[field] = fields[field][0];
        }
        for (const key of ["revise", "moderation"]) {
          if (req[key] === "true" || req[key] === "false") req[key] = req[key] === "true";
        }
        if (present(req.seed) && /^-?\d+$/.test(req.seed)) req.seed = Number(req.seed);
        for (const file of ctx.body.files || []) {
          if (file.field !== "input_reference") throw new Error("unexpected file field: " + file.field);
          if (upload || present(req.input_reference)) throw new Error("input_reference must be provided once");
          if (Number(file.size) > VIDEO_IMAGE_BYTES) throw new Error("input_reference exceeds 10 MiB");
          let mime = String(file.mimeType || "").toLowerCase();
          if (mime === "image/jpg") mime = "image/jpeg";
          if (!VIDEO_IMAGE_TYPES.includes(mime)) throw new Error("input_reference must be image/jpeg or image/png");
          upload = { __fileRef: file.ref, encoding: "dataUrl", mimeType: mime, maxBytes: VIDEO_IMAGE_BYTES };
        }
      }
      const body = {};
      for (const key of Object.keys(req)) {
        if (key === "seconds" || key === "size" || key === "input_reference") continue;
        body[key] = req[key];
      }
      if (present(req.seconds)) {
        if (present(req.duration)) throw new Error("send seconds or duration, not both");
        body.duration = Number(req.seconds);
      }
      const reference = upload || (present(req.input_reference) ? req.input_reference : null);
      if (reference) {
        if (present(req.image) || present(req.image_url)) throw new Error("send input_reference, image or image_url, not several");
        if (plainObject(reference) && reference.__fileRef) body.image = reference;
        else if (httpURL(reference)) body.image_url = trimmed(reference);
        else body.image = reference;
      }
      if (present(req.size)) {
        if (present(body.image) || present(body.image_url)) throw new Error("size applies to text to video only; the input image sets the frame");
        const ratio = videoSize(req.size);
        if (present(req.aspect_ratio) && trimmed(req.aspect_ratio) !== ratio) throw new Error("size and aspect_ratio disagree");
        body.aspect_ratio = ratio;
      }
      const model = ctx.model;
      const requestBody = Object.assign({}, body, { model: model });
      // Model-specific checks run in buildSubmitRequest, against the upstream model.
      return videoIntent(model, requestBody);
    },
    render: function (ctx, task) {
      const statuses = { NOT_START: "queued", SUBMITTED: "queued", QUEUED: "queued", IN_PROGRESS: "in_progress", SUCCESS: "completed", FAILURE: "failed" };
      const output = {
        id: task.task_id,
        object: "video",
        model: (task.properties || {}).origin_model_name || VIDEO_MODELS[0],
        status: statuses[task.status] || "queued",
        progress: Number(String(task.progress || "0").replace("%", "")) || 0,
        created_at: task.created_at,
        seconds: String(VIDEO_SECONDS),
      };
      if (Number(task.updated_at) > 0 && (task.status === "SUCCESS" || task.status === "FAILURE")) output.completed_at = Number(task.updated_at);
      if (task.status === "FAILURE") output.error = { code: "task_failed", message: task.fail_reason || "video generation failed" };
      return output;
    },
  },
};

# `@itsrose/pixverse`

Typed client for the PixVerse video generation platform API.

> [!warning] Required environment
>
> - `PIXVERSE_API_KEY`: API key created in the PixVerse console. **Required** — importing the package reads it.
> - `PIXVERSE_BASE_URL`: API base URL. Defaults to `https://app-api.pixverse.ai`.

## Overview

- Every call is made through `@itsrose/upstream-client`, so a failure is always an `UpstreamApiError` with `service: "pixverse"`.
- Every request carries a fresh `Ai-trace-id`; you never supply one.
- Success is decided by `ErrCode === 0`, not by the HTTP status — PixVerse answers `HTTP 200` for a failed operation, and a non-zero `ErrCode` is raised as a failure.
- Generation requests are never retried (they would create a second task). Status queries are safe to repeat.

## Usage

```ts
import { createTextToVideo, getTask, waitForTask } from "@itsrose/pixverse";

// 1. Create a task. This does not render the video.
const { video_id, credits } = await createTextToVideo({
	model: "v6-max",
	prompt: "A blue glass marble rolls across a clean white table",
	duration: 5,
	quality: "720p",
	aspect_ratio: "16:9",
});

// 2. Wait for it. Polls every 3 s and stops on any terminal state.
const task = await waitForTask(video_id, { timeout_ms: 300_000 });
console.log(task.url);

// or poll once and decide yourself
const state = await getTask(video_id); // state.status: 1 | 5 | 7 | 8
```

### Image-to-video

```ts
import { createImageToVideo, uploadImage } from "@itsrose/pixverse";

const image = await uploadImage({
	file: { data: bytes, filename: "frame.jpg", content_type: "image/jpeg" },
});

await createImageToVideo({
	model: "v6",
	prompt: "The cup begins to steam",
	duration: 5,
	quality: "720p",
	aspect_ratio: "16:9",
	img_id: image.img_id,
});

// a template task names the template instead of an image
await createImageToVideo({
	model: "v6",
	prompt: "…",
	duration: 5,
	quality: "720p",
	aspect_ratio: "16:9",
	template_id: 519,
	img_ids: [image.img_id],
});
```

### Account balance

```ts
import { getAccountBalance } from "@itsrose/pixverse";

const { credit_monthly, credit_package } = await getAccountBalance();
```

### Webhook callbacks

Register a callback URL in the PixVerse console to get a `webhook_id` and a
secret, then pass `webhook_id` in a generation request.

```ts
import { verifyWebhookSignature } from "@itsrose/pixverse";

const callback = verifyWebhookSignature({
	headers: request.headers,
	body: request.body,
	secret: process.env.PIXVERSE_WEBHOOK_SECRET,
});

if (!callback) {
	// signature invalid, stale, or not a task result
	reply.code(401).send("unauthorized");
	return;
}

reply.send("ok"); // PixVerse retries anything but 200 / "ok"
```

The signature is `Base64(HMAC-SHA256(secret, "{timestamp}\n{nonce}\n{urlencoded}"))`
over the payload keys sorted alphabetically, compared timing-safely. Callbacks
older than five minutes are rejected.

## Task lifecycle

| `status` | Meaning                   | What the helpers do              |
| :------- | :------------------------ | :------------------------------- |
| `1`      | Generation completed      | `waitForTask` resolves           |
| `5`      | Generating                | keeps polling                    |
| `7`      | Content moderation failed | raises `PixverseTaskError` (422) |
| `8`      | Generation failed         | raises `PixverseTaskError` (422) |

## Coverage

This wave ships the documented core flow: upload → create (text and image) →
poll → result, plus the account balance and webhook verification. The rest of
the documented surface — first/last-frame, fusion, multi-transition, extend,
expand, image template and result, upscale, restyle, lipsync, image avatar,
video mask, sound effect, swap, mimic, real-estate, VibeMV, effect lists, TTS
speakers and custom voices — is pending.

Those pages publish prose and an example payload but not the field tables the
shipped endpoints publish, so their schemas cannot be pinned with the same
confidence yet. They share this package's envelope, task and error plumbing, so
each is a thin module once its contract is pinned.

## Request contract

| Field                        | Notes                                                                       |
| :--------------------------- | :-------------------------------------------------------------------------- |
| `model`                      | `v6-max`, `c1`, `v6`, `v3.5`, `v4`, `v4.5`, `v5`, `v5-fast`, `v5.5`, `v5.6` |
| `prompt`                     | 1–5000 characters                                                           |
| `duration`                   | 1–15 seconds                                                                |
| `quality`                    | `360p`, `540p`, `720p`, `1080p`                                             |
| `aspect_ratio`               | `16:9`, `9:16`, `4:3`, `3:4`, `1:1`, `2:3`, `3:2`, `21:9`                   |
| `seed`                       | `0` – `2147483647`                                                          |
| `webhook_id`                 | deliver status changes instead of polling                                   |
| `generate_audio_switch`      | add an audio track                                                          |
| `generate_multi_clip_switch` | render a multi-clip video                                                   |

Inputs are validated before a request is sent, so a request the API would
reject by contract fails locally instead.

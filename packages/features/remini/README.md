# `@itsrose/remini`

Typed client for the Remini image-enhancement service. It handles Oracle setup, task creation, websocket result delivery, and the associated validation schemas.

## Overview

- `createTask` uploads an input image, submits the requested pipelines, and waits for the resulting output.
- `ReminiClient` wraps the HTTP client, Oracle setup, and task pipeline helpers.
- `Oracle` and `TaskSocket` isolate the handshake and websocket lifecycle details.

## Required environment

- `REMINI_API_BASE_URL`: Base URL for the Remini API.
- `REMINI_WSS_BASE_URL`: Base URL for the Remini websocket endpoint.

## Usage

```ts
import { createTask } from "@itsrose/remini";

const result = await createTask({
	init_image: {
		type: "url",
		value: "https://example.com/input.jpg",
	},
	pipelines: [],
});
```

# `@itsrose/tiktok`

TikWM-backed TikTok content fetcher with typed request and response schemas.

> [!warning] Required environment
>
> - `TIKTOK_TIKWM_BASE_URL`: TikWM base URL.
> - `TIKWM_APIKEY`: TikWM API key.

## Overview

- `getContent` requests TikTok metadata and normalizes the response shape.
- `getContentSchema` exposes the request and response schemas.
- The package stays focused on typed data retrieval rather than UI or storage concerns.

## Usage

```ts
import { getContent } from "@itsrose/tiktok";

const content = await getContent({
	url: "https://www.tiktok.com/@user/video/1234567890",
});
```

# `@itsrose/instagram`

Instagram media scraping helpers and typed response schemas. The package coordinates multiple scraper backends and returns the first successful result.

## Overview

- `getMedia` scrapes a media URL through the configured scraper providers.
- `getMediaSchema` exposes the request and response schemas for validation.
- The scraper pipeline includes multiple providers so the caller gets a resilient fallback path.

## Example

```ts
import { getMedia } from "@itsrose/instagram";

const media = await getMedia({
	url: "https://www.instagram.com/p/example/",
});
```

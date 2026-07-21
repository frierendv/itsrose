# `@itsrose/api-client`

Typed API client for the ItsRose OpenAPI surface. It wraps the shared HTTP client and exposes a small, type-safe request layer for generated paths.

## Overview

- `APIClient<TPaths>` provides typed `get`, `post`, `put`, `patch`, and `delete` helpers.
- `ItsRoseAPIClient<TPaths>` creates an `APIClient` with the shared HTTP client defaults.
- `scripts/generate-openapi.ts` keeps the client types aligned with the API schema.

## Example

```ts
import { ItsRoseAPIClient } from "@itsrose/api-client";
import type { paths } from "./generated/openapi";

const api = new ItsRoseAPIClient<paths>({
	baseURL: "https://api.example.com",
});

const health = await api.get("/health");
console.log(health.data);
```

The request helper understands OpenAPI path parameters, query parameters, JSON bodies, and form payloads through the generated path types.

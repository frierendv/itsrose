# `@itsrose/http-client`

Axios-based HTTP client wrapper with retry support and a promise-like request builder. It standardizes outbound HTTP behavior across the monorepo.

## Overview

- `createHttpClient` creates a callable client with retry defaults and a shared user agent.
- `fetcher` exports a prebuilt client for simple requests.
- The request builder supports `.onError(...)` for typed error normalization.

## Example

```ts
import { createHttpClient } from "@itsrose/http-client";

const client = createHttpClient({
	baseURL: "https://api.example.com",
});

const { data } = await client.get<{ ok: boolean }>("/health");
```

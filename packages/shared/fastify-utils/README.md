# `@itsrose/fastify-utils`

Fastify-focused shared helpers and schemas used across the ItsRose services. The package keeps other Fastify-adjacent utilities consistent.

## Overview

- `generateRequestTrackingId` reuses incoming request IDs when present and falls back to a generated value.
- `IRequestTrackingIdOptions` lets callers configure the header lookup order and prefix.

## Example

```ts
import { generateRequestTrackingId } from "@itsrose/fastify-utils";

const requestId = generateRequestTrackingId(request, { prefix: "api" });
```

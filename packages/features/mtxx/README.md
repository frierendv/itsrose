# `@itsrose/mtxx`

Typed client for the MTXX image-generation and image-enhancement service. It includes the HTTP client, task helpers, utility functions, and Zod schemas used by the feature workflows.

> [!warning]
>
> **Required environment**
>
> - `MTXX_SDK_BASE_URL`: SDK base URL.
> - `MTXX_OPENAPI_BASE_URL`: OpenAPI base URL.
> - `MTXX_KEY`: SDK key.
> - `MTXX_SECRET`: SDK secret.

## Overview

- `removeBg`, `expressionGeneration`, `outpainting`, `versatileHairstyle`, `clothesSegmentation`, and `imageRestoration` cover the main public tasks.
- `MTXXClient` and the client helpers manage the service connection and signing logic.
- `src/resources` contains the service-specific payload helpers used by the task builders.

## Usage

```ts
import { removeBg } from "@itsrose/mtxx";

const result = await removeBg({
	image: "https://example.com/image.jpg",
});
```

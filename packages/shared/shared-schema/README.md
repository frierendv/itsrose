# `@itsrose/shared-schema`

Shared Zod schemas reused across ItsRose packages. The package centralizes common request and media payload shapes so downstream feature packages stay consistent.

## Overview

- `SharedImageSchema` accepts URL or base64 image values and normalizes them into a typed object.
- `SharedFileBufferSchema` documents the binary buffer shape used in multipart uploads.
- `SharedSyncTimeoutSchema` captures the standardized sync timeout input.

## Example

```ts
import { SharedImageSchema } from "@itsrose/shared-schema";

const image = SharedImageSchema.parse("https://example.com/image.jpg");
```

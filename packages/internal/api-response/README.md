# `@itsrose/api-response`

Shared helpers for creating and normalizing typed API success and failure responses. The package keeps response envelopes, status codes, and metadata handling consistent across services.

## Overview

- `createResponse` builds a response object from a success or failure payload.
- `SuccessResponse` and `FailureResponse` expose the concrete response constructors.
- `response` and `zod-schema` exports provide the typed model and runtime validation layers.

## Example

```ts
import { createResponse } from "@itsrose/api-response";

const response = createResponse.success({
	code: "SUCCESS",
	message: "OK",
	data: { ok: true },
});
```

Internal package for handling API responses and errors in a consistent manner across the application.

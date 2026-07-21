# `@itsrose/http-code`

Shared API and HTTP status code maps used by the response layer. The package keeps success and error code definitions centralized so response modeling stays consistent.

## Overview

- `SUCCESS`, `CLIENT_ERROR`, `SERVER_ERROR`, and `BUSINESS_ERROR` group the canonical code sets.
- `SUCCESS_CODE` and `ERROR_CODE` provide the normalized lookup maps.
- `APIResponseCode` and `HttpStatusCode` expose the derived type unions.

## Example

```ts
import { SUCCESS_CODE } from "@itsrose/http-code";

console.log(SUCCESS_CODE.OK.http_code);
```

# `@itsrose/http-code`

Internal dep for `@itsrose/api-response`

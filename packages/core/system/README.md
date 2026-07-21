# `@itsrose/system`

Shared environment, constant, and error utilities used across the ItsRose packages. This package centralizes process environment parsing and the standard error classes used by feature clients.

## Features

- `getEnv` reads environment variables with validation and optional preprocessing.
- `InvalidRequestError`, `SystemError`, and `ThirdPartyApiError` provide consistent error semantics.
- `USER_AGENT` exposes the common ItsRose user agent string used by outbound requests.

## Example

```ts
import { getEnv, InvalidRequestError } from "@itsrose/system";

const apiKey = getEnv("API_KEY", { isRequired: true });

if (!apiKey) {
	throw new InvalidRequestError("Missing API key.");
}
```

# `@itsrose/http-client`

Axios-based HTTP client wrapper with intelligent retry support, fluent request builders, and typed error handling. Standardizes outbound HTTP behavior across the ItsRose platform.

## Features

- **Callable Client**: Call `client(config)` or `client(url, config)` directly, or use fluent methods (`.get()`, `.post()`, `.put()`, `.patch()`, `.delete()`, `.head()`, `.options()`, `.request()`).
- **Standard Promise Integration**: `RequestBuilder` implements the complete `Promise` interface (`.then()`, `.catch()`, `.finally()`) and memoizes request execution.
- **Direct Unwrapping**: Use `.unwrap()` to extract data payloads directly and automatically throw normalized error payloads on failure.
- **Typed Error Normalization**: Chain `.onError((data, status, error) => ...)` to transform API error responses into typed application structures.
- **Configurable Retries**: Automatically retries on network errors, idempotent operations, and 5xx server errors with exponential backoff (powered by `axios-retry`). Retries can be fine-tuned or disabled with `retry: false`.
- **First-Class Extension Points**: Add default headers, rewrite outgoing requests, inspect responses, and swap the transport — without touching the underlying HTTP library.
- **Client Inheritance**: Clone and extend clients cleanly using `client.create(...)` and `client.extend(...)`.
- **Global Fetcher**: Pre-configured singleton `fetcher` instance ready for immediate use.

## Installation

```bash
pnpm add @itsrose/http-client
```

## Usage

### Basic Requests

```ts
import { fetcher } from "@itsrose/http-client";

// Using the default fetcher singleton
const { data, status, ok } = await fetcher.get<{ message: string }>(
	"/api/health"
);
```

### Custom Client Instance

```ts
import { createHttpClient } from "@itsrose/http-client";

const client = createHttpClient({
	baseURL: "https://api.example.com",
	timeout: 10000,
	headers: {
		Authorization: "Bearer <token>",
	},
});

// Callable client syntax
const response = await client("/v1/users", { method: "get" });

// Method shortcuts
const { data } = await client.post("/v1/items", { name: "New Item" });
```

### Direct Data Unwrapping with `.unwrap()`

Use `.unwrap()` when you want the response data directly, or throw an error if the request fails:

```ts
// Throws the underlying error if request fails, returns data on success
const user = await client.get<UserProfile>("/v1/me").unwrap();
console.log(user.name);
```

### Typed Error Handling with `.onError()`

Transform upstream API errors into domain-specific structures without try/catch blocks:

```ts
interface ApiError {
	statusCode: number;
	errorMessage: string;
}

const { data, error } = await client
	.post("/v1/generate", { prompt: "Hello" })
	.onError<ApiError>((data, status, err) => ({
		statusCode: status ?? 500,
		errorMessage: data?.detail || "Inference failed",
	}));

if (error) {
	console.error(`Failed [${error.statusCode}]: ${error.errorMessage}`);
}
```

### Combining `.onError()` with `.unwrap()`

```ts
// Will throw your custom formatted error if the request fails
const audio = await client
	.post<Buffer>("/v1/tts", { text: "Hello" })
	.onError((data, status) => new CustomApiError(data?.message, status))
	.unwrap();
```

### Client Inheritance with `.extend()`

```ts
const baseClient = createHttpClient({
	baseURL: "https://api.example.com",
	headers: { "x-app": "itsrose" },
});

const authenticatedClient = baseClient.extend({
	headers: { Authorization: "Bearer secret-token" },
});
```

### Disabling or Customizing Retries

```ts
// Disable retries completely
const noRetryClient = createHttpClient({
	baseURL: "https://api.example.com",
	retry: false,
});

// Custom retry policy
const customRetryClient = createHttpClient({
	baseURL: "https://api.example.com",
	retryConfig: {
		retries: 5,
		retryDelay: (retryCount) => retryCount * 1000,
	},
});
```

### Default Headers

`setDefaultHeader` and `setDefaultHeaders` set headers that every request of
the client carries — including requests dispatched after the headers were set.

```ts
const client = createHttpClient({ baseURL: "https://api.example.com" });

client.setDefaultHeader("x-client", "itsrose");
client.setDefaultHeaders({ "x-tenant": "acme" });
```

### Request & Response Hooks

A request hook rewrites the configuration before it is dispatched. It receives
the **resolved** configuration: the client defaults are already merged in, so
`config.baseURL` is the effective base URL of the request.

```ts
const client = createHttpClient({
	baseURL: "https://api.example.com",
	requestTransform: (config) => {
		if (config.baseURL === "https://api.example.com") {
			config.headers.set("x-signed", "yes");
		}
		return config;
	},
});
```

A response hook inspects the response before it reaches the caller. Throwing
from it rejects the request, which is how a transport maps a successful HTTP
response onto a domain error.

```ts
const client = createHttpClient({
	baseURL: "https://api.example.com",
	responseTransform: (response) => {
		if (response.data?.status_code === "407") {
			throw new Error("expired");
		}
		return response;
	},
});
```

> The hooks are named `requestTransform` and `responseTransform` rather than
> `transformRequest` / `transformResponse`, because the latter already belong
> to the underlying transport's own data transformers.

### Resolving a Request URL

`resolveUrl` returns the absolute URL a request configuration targets, query
string included.

```ts
client.resolveUrl("/v1/users"); // "https://api.example.com/v1/users"
```

### Swapping the Transport

The `adapter` option replaces the network layer of the client. It is the
supported seam for stubbing or observing the transport in a test.

```ts
const client = createHttpClient({
	baseURL: "https://api.example.com",
	adapter: async (config) => ({
		data: { stubbed: true },
		status: 200,
		statusText: "OK",
		headers: {},
		config,
	}),
});
```

### Cancellation with `AbortController`

```ts
import { isCancel } from "@itsrose/http-client";

const controller = new AbortController();

setTimeout(() => controller.abort(), 1000);

const { error } = await client.get("/long-operation", {
	signal: controller.signal,
});

if (isCancel(error)) {
	console.log("Request was canceled");
}
```

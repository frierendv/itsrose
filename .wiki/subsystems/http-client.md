# Shared HTTP client

`packages/internal/http-client` — `@itsrose/http-client`. The transport every
upstream call goes through. As of `70ab174` on `development` of
`frierendv/itsrose`.

## What it is

An axios wrapper. `HttpClient` / `createHttpClient` / the `fetcher` singleton,
with retry, a user-agent, typed errors, and a `HttpPromise` that memoises
execution across multiple awaits.

## What it promised and did not do

Its default retry config documented _"retries up to 3 times with exponential
backoff on network errors or 5xx server responses"_ and never fired. The
guard was on `error.isAxiosError`, which axios-retry sets on every failure.
Measured: 1 attempt where stock axios-retry made 4.

Fixed at `7e69f44`. See [the decision](../decisions/http-retry-contract.md).

## The axios leak — closed

**Fixed at `4d292ed`.** `HttpClient` used to expose `interceptors`,
`defaults` and `axiosInstance`, so a caller of the client learned axios
rather than the client. Four consumers used them.

The client now has a surface for what those consumers actually needed:

| Surface                                  | For                                                  |
| ---------------------------------------- | ---------------------------------------------------- |
| `requestTransform`                       | signing, auth headers, rewriting the outgoing config |
| `responseTransform`                      | mapping the upstream response                        |
| `adapter`                                | injecting the transport — a deliberate test seam     |
| `setDefaultHeader` / `setDefaultHeaders` | a header computed after construction                 |
| `resolveUrl`                             | the absolute URL a request targets                   |

Two things about it are worth remembering, because both are easy to get
wrong:

- **The hook names are `requestTransform` and `responseTransform`, not
  `transformRequest` and `transformResponse`.** Axios already owns those two
  key names for its own _data_ transformers. `axios.create(config)` would
  have handed our hook to axios, and axios would have called it with
  `(data, headers)` instead of `(config)`.
- **The hooks are registered after the retry interceptor.** Axios runs
  request interceptors in reverse registration order and response
  interceptors in registration order. Registering the hooks last means the
  retry interceptor counts the attempts and the hooks own the caller's
  payload. Registering them earlier would let midtrans' business-status
  mapping preempt retries on a 5xx.

The mtxx signing behaviour now has a test that proves it: the
`Authorization` value is decoded and checked for the HMAC prefix, the signed
headers and a 64-character hex signature — and a request to the openapi base
URL is shown NOT to be signed and instead to carry `api_key` and `api_secret`
in the query. That logic had only implicit coverage before.

## The feature packages sit on top of it, inconsistently

As of 2026-11-14, six feature packages use three different HTTP idioms —
`createHttpClient` held on a class, `createHttpClient` at module scope, and a
global `fetcher` — and four different error-mapping implementations. Only one
response schema is actually parsed across all six.

## Related

- [HTTP retry decision](../decisions/http-retry-contract.md)
- [Midtrans client](midtrans.md)

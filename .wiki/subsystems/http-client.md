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

## The axios leak

`HttpClient` exposes `interceptors`, `defaults` and `axiosInstance` — so
callers learn axios rather than the client. Two feature packages use it:
`packages/features/mtxx` mutates `client.defaults.headers.common` and
`client.interceptors.request` to sign its requests, and
`packages/features/remini` extends `HttpClient` directly. Wave 3 closes these
behind a `sign`/`headers` hook, which is the precondition for the
upstream-client module (candidate C2) to be worth building.

## The feature packages sit on top of it, inconsistently

As of 2026-11-14, six feature packages use three different HTTP idioms —
`createHttpClient` held on a class, `createHttpClient` at module scope, and a
global `fetcher` — and four different error-mapping implementations. Only one
response schema is actually parsed across all six.

## Related

- [HTTP retry decision](../decisions/http-retry-contract.md)
- [Midtrans client](midtrans.md)

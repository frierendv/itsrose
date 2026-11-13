# A shared HTTP retry contract

**Decided 2026-11-14.** Landed as `7e69f44`.

## The decision

`@itsrose/http-client` promises: _retries up to 3 times with exponential
backoff on network errors or 5xx server responses_. The condition is expressed
over the failure itself — the status code, or the absence of a response — never
over the transport's brand.

## Why

At `70ab174` the default `retryCondition` short-circuited on
`error?.isAxiosError === true`. axios-retry always hands the condition the raw
`AxiosError`, so that guard was true for every failure and the policy never
fired.

Measured against a local stub server: the repo client made **1** attempt where
stock axios-retry made **4**. No feature package re-implemented retry locally,
so the entire upstream surface had no retry at all.

## The rule

- a cancelled request is never retried
- 4xx is the server's answer, not a blip — never retried
- a response-less failure is a network error — retried
- 5xx is retried

## Caveat, stated on 2026-11-14

5xx now retries for every method, including ones that mutate state. The
behaviour was always what the module advertised and six feature packages
assumed a retry that never came — but callers issuing non-idempotent requests
should narrow the policy with `retry: { retryCondition }`. If upstream writes
are at risk of duplicating, that is a Wave 2 conversation.

## Test surface

`packages/internal/http-client/__tests__/retry.test.ts` drives a real server
and asserts attempt counts. It fails against the old policy (expected 3,
received 1), so it is a regression test rather than a description of the new
code.

## Related

- [Shared HTTP client](../subsystems/http-client.md)
- [The environment does not fail loudly](../problems/environment-does-not-fail-loudly.md)

# Interfaces that permit misuse

**Observed 2026-11-14**, by a pit-of-success audit.

Some of the most expensive bugs in this repo were not caused by a wrong
decision. They were caused by an interface whose _shape_ permitted the wrong
thing, and a test that asserted the shape rather than the behaviour.

Three examples, in increasing order of cost.

## 1. `withAuthQueryFn` — a promise that started too early

`apps/dashboard/lib/api/with-auth-query.ts` took an already-created promise.
The request therefore started at the call site, before TanStack Query could
decide whether the query was enabled. The admin user popover renders inside
every row of the admin invoice and subscription tables, so every render of a
closed popover issued one admin request.

Fixed at `a798101` by making the helper take a **thunk**. The interface can
no longer express the mistake.

## 2. `createSDKParameter` — a default destroyed by an explicit `undefined`

`packages/features/mtxx/src/utils/parameter.ts` applied its default _before_
spreading the caller's options:

```ts
{ task_id: generateUUID(), sync_timeout: 60, ...initialParameter, params }
```

Every mtxx operation destructures `sync_timeout` out of its options and
forwards the key, so the key is always present — and when the caller omitted
it, the value was `undefined`, which overwrote the default. The field was
dropped from the request entirely, and the upstream applied its own default
of 30 seconds instead of the 60 the package intended.

The unit test asserted `expect(sdkParam.sync_timeout).toBe(60)` — but called
the helper directly, **without the key**. The test asserted a shape the
production path never produced.

Fixed at `b1c35e4`: the default comes after the spread, and the new test
covers the omitted case and fails against the old code (expected 60, received
`undefined`).

## 3. The retry policy — a promise the module did not keep

`packages/internal/http-client`'s documented behaviour was "retries up to 3
times with exponential backoff on network errors or 5xx server responses". The
condition short-circuited on `error.isAxiosError`, which axios-retry sets on
every failure, so the policy never fired. Measured: 1 attempt where stock
axios-retry made 4.

Fixed at `7e69f44`. The regression test drives a real `node:http` server and
asserts **attempt counts** — `expect(attempts).toBe(3)` — rather than the
shape of the config.

## The pattern

All three are the same failure:

1. Something promised a behaviour.
2. An interface permitted the promise to be broken.
3. A test asserted the _shape_ — that a default existed, that a config field
   had the right value, that a promise was passed — instead of asserting the
   _behaviour_ through the public interface.
4. The promise was false, and nothing noticed.

## The rule that follows

**A test that asserts a config has the right shape is not a test of the
behaviour.** The test must observe the outcome: the attempt count, the
outgoing request, the settled subscription.

The house example to copy is
`packages/internal/http-client/__tests__/retry.test.ts` — a real server,
real requests, and the observable outcome asserted.

## Two more shapes worth fixing

- `packages/internal/http-client/src/utils/normalize-config.ts:11-30` —
  `normalizeRequestConfig(urlOrConfig, config?)` accepts `(string, config)` or
  `(config, config)`. The second form silently merges the two with the second
  winning, so `client({url:"a", timeout:1}, {url:"b"})` yields `url:"b"` with
  no diagnostic. Overloads would make the second form unrepresentable.
- `packages/auth/billing/src/adapter/repository.ts:390` —
  `record(eventName, eventJson, createdAt)`, three positionals, two of them
  strings. Swapping `eventName` and `eventJson` compiles and writes garbage
  to the invoice-event table. An options object would not.

## Related

- [The environment does not fail loudly](environment-does-not-fail-loudly.md)
- [Mandatory rules that nothing enforces](mandatory-rules-that-nothing-enforces.md)

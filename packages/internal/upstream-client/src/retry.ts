import type { RetryConfig } from "@itsrose/http-client";

/**
 * A retry condition that never retries.
 *
 * The shared retry contract retries a 5xx for every method, including the
 * ones that mutate state. A request that may have created something
 * upstream — a task, a voice, a composition — must not be replayed, so it
 * narrows the policy instead of inheriting it:
 *
 * ```ts
 * await client.send({
 * 	url: "/v1/mobile/tasks",
 * 	method: "POST",
 * 	data: body,
 * 	retry: { retryCondition: neverRetry },
 * });
 * ```
 */
export const neverRetry: NonNullable<RetryConfig["retryCondition"]> = () =>
	false;

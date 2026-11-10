/**
 * Sandbox credit-card tokenization helper.
 *
 * Midtrans exposes card tokenization at `GET /v2/token`, authenticated with the
 * **client key** only (no server key). The returned `token_id` is then used by
 * `POST /v2/charge` with `payment_type: "credit_card"`.
 *
 * This module is test tooling: it never ships in the published package and is
 * only reachable from `tools/` and opt-in integration tests.
 *
 * @see https://docs.midtrans.com/reference/get-token
 * @see https://docs.midtrans.com/docs/testing-payment-on-sandbox
 */

import { API_BASE_URL_SANDBOX } from "../src/constants";

/**
 * Outcome a sandbox test card produces when charged.
 *
 * - `accept`: charge succeeds and is captured (`200`, `capture`/`accept`).
 * - `deny`: the bank declines it (`202`, `deny`).
 */
export type TestCardOutcome = "accept" | "deny";

export interface TestCard {
	/** Human readable label. */
	readonly label: string;
	/** Card number. */
	readonly number: string;
	/** Expected charge outcome on the sandbox. */
	readonly outcome: TestCardOutcome;
}

/**
 * Test cards verified against the sandbox on 2026-11-10.
 *
 * The published "denied" test cards (`4411 …`) are **accepted** by this
 * sandbox merchant, while `4111 …` and `4911 …` are declined. Treat this table
 * as observed behaviour, not vendor documentation.
 */
export const TEST_CARDS = {
	/** Visa, captured successfully. */
	visa: {
		label: "Visa success",
		number: "4811111111111114",
		outcome: "accept",
	},
	/** Mastercard, captured successfully. */
	mastercard: {
		label: "Mastercard success",
		number: "5211111111111117",
		outcome: "accept",
	},
	/** Visa declined by the acquiring bank. */
	visaDenied: {
		label: "Visa denied by bank",
		number: "4111111111111111",
		outcome: "deny",
	},
	/** Visa declined by the acquiring bank (alternate). */
	visaDeniedAlt: {
		label: "Visa denied by bank (4911)",
		number: "4911111111111113",
		outcome: "deny",
	},
} as const satisfies Record<string, TestCard>;

export type TestCardKey = keyof typeof TEST_CARDS;

/** Default expiry sent for every test card. */
export const TEST_CARD_EXPIRY = { month: "12", year: "2030" } as const;

/** Default CVV sent for every test card. */
export const TEST_CARD_CVV = "123";

export interface CardTokenOptions {
	/** Card number. */
	readonly cardNumber: string;
	/** Card key used for tokenization (the Midtrans client key). */
	readonly clientKey: string;
	/** Expiry month, two digits. Defaults to `12`. */
	readonly expMonth?: string;
	/** Expiry year, four digits. Defaults to `2030`. */
	readonly expYear?: string;
	/** CVV. Defaults to `123`. */
	readonly cvv?: string;
	/** Core API base URL. Defaults to the sandbox. */
	readonly baseUrl?: string;
}

interface TokenResponse {
	token_id?: string;
	status_code?: string;
	status_message?: string;
}

/**
 * Creates a sandbox card token for the given card.
 *
 * @throws When the sandbox rejects the card (invalid number, expired, …).
 */
export async function createCardToken(
	options: CardTokenOptions
): Promise<string> {
	const {
		cardNumber,
		clientKey,
		expMonth = TEST_CARD_EXPIRY.month,
		expYear = TEST_CARD_EXPIRY.year,
		cvv = TEST_CARD_CVV,
		baseUrl = API_BASE_URL_SANDBOX,
	} = options;

	if (!clientKey) {
		throw new Error("createCardToken requires a Midtrans client key");
	}

	const query = new URLSearchParams({
		card_number: cardNumber,
		card_exp_month: expMonth,
		card_exp_year: expYear,
		card_cvv: cvv,
		client_key: clientKey,
	});

	const response = await fetch(`${baseUrl}/v2/token?${query}`, {
		headers: { Accept: "application/json" },
	});

	const body = (await response.json()) as TokenResponse;

	if (!body.token_id) {
		throw new Error(
			`Card tokenization failed for ${cardNumber}: ${
				body.status_message ?? response.statusText
			}`
		);
	}

	return body.token_id;
}

/**
 * Creates a card token for one of the registered {@link TEST_CARDS}.
 */
export async function createTestCardToken(
	key: TestCardKey,
	clientKey: string
): Promise<string> {
	return createCardToken({
		cardNumber: TEST_CARDS[key].number,
		clientKey,
	});
}

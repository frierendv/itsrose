import type { HttpClientError } from "@itsrose/http-client";
import type { z } from "zod/v4";
import { BUSINESS_SUCCESS_CODES } from "../../src/client/business-status";
import {
	isMidtransApiError,
	normalizeMidtransError,
	type MidtransApiError,
	type MidtransErrorKind,
} from "../../src/client/error";
import {
	ApiErrorSchema,
	CoreErrorSchema,
	DefaultErrorSchema,
	MidtransApiErrorSchema,
	TransportErrorSchema,
	UnauthorizedErrorSchema,
} from "../../src/schema/error";
import * as schemaBarrel from "../../src/schema/index";

function transportError(status: number, message = "transport failure") {
	return { status, message } as HttpClientError;
}

/** Compile-time assertion that two types are identical. */
type AssertSame<A, B> = [A] extends [B]
	? [B] extends [A]
		? true
		: false
	: false;

/**
 * Every upstream error shape the client can receive, with the single
 * classification the model must produce for it.
 */
interface ShapeCase {
	readonly name: string;
	readonly payload: unknown;
	readonly kind: MidtransErrorKind;
	readonly status: number;
}

const SHAPES: readonly ShapeCase[] = [
	{
		name: "core error with a numeric string status",
		payload: {
			status_code: "402",
			status_message: "declined",
			id: "err-1",
			validation_messages: ["amount is invalid"],
		},
		kind: "core",
		status: 402,
	},
	{
		name: "core error with a numeric status",
		payload: { status_code: 412, status_message: "cannot update" },
		kind: "core",
		status: 412,
	},
	{
		name: "subscription-shaped error",
		payload: {
			status_message: "Invalid parameter.",
			validation_messages: ["subscription.token is required"],
		},
		kind: "core",
		status: 400,
	},
	{
		name: "legacy error_messages envelope",
		payload: { error_messages: ["Not Found"] },
		kind: "legacy",
		status: 404,
	},
	{
		name: "unauthorized body",
		payload: { error: "Unauthorized" },
		kind: "unauthorized",
		status: 401,
	},
	{
		name: "empty body",
		payload: "",
		kind: "transport",
		status: 404,
	},
	{
		name: "unknown JSON body",
		payload: { unexpected: true },
		kind: "transport",
		status: 503,
	},
];

describe("the single Midtrans error model", () => {
	it.each(SHAPES)(
		"classifies $name as $kind with status $status",
		({ payload, kind, status }) => {
			const result = normalizeMidtransError(
				payload,
				transportError(status)
			);

			expect(result.kind).toBe(kind);
			expect(result.status_code).toBe(status);
			expect(isMidtransApiError(result)).toBe(true);
		}
	);

	it("produces the same classification from the schema and the runtime", () => {
		for (const shape of SHAPES) {
			const parsed = ApiErrorSchema.safeParse(shape.payload);

			expect(parsed.success).toBe(true);
			if (!parsed.success) {
				continue;
			}

			expect(parsed.data.kind).toBe(shape.kind);
			expect(normalizeMidtransError(shape.payload).kind).toBe(shape.kind);
		}
	});

	it("is total: every input yields exactly one kind", () => {
		const hostile: readonly unknown[] = [
			undefined,
			null,
			"",
			"plain text",
			0,
			[],
			[1, 2, 3],
			Symbol("hostile"),
			{ status_code: null },
			{ status_code: "not-a-number" },
			{ status_code: 200, status_message: "ok-ish" },
			{ error: "" },
			{ error_messages: "not-an-array" },
			{ status_message: "" },
		];

		for (const payload of hostile) {
			const result = normalizeMidtransError(payload);

			expect(["core", "legacy", "unauthorized", "transport"]).toContain(
				result.kind
			);
			expect(result.status_code).toBeGreaterThanOrEqual(400);
			expect(result.status_code).toBeLessThanOrEqual(599);
			expect(isMidtransApiError(result)).toBe(true);
		}
	});

	it("normalizes the status: payload first, then the HTTP status, then 500", () => {
		expect(
			normalizeMidtransError({ status_code: "402", status_message: "x" })
				.status_code
		).toBe(402);

		expect(
			normalizeMidtransError(
				{ status_code: "not-a-number", status_message: "x" },
				transportError(418)
			).status_code
		).toBe(418);

		expect(normalizeMidtransError(undefined).status_code).toBe(500);
	});

	it("keeps the raw status code available next to the normalized one", () => {
		const result = normalizeMidtransError({
			status_code: "402",
			status_message: "declined",
		});

		expect(result.status_code).toBe(402);
		expect(result.status_code_raw).toBe("402");
	});

	it("exposes one schema per kind, each rejecting the other kinds", () => {
		const legacy = { error_messages: ["Not Found"] };
		const unauthorized = { error: "Unauthorized" };
		const core = { status_code: "402", status_message: "declined" };

		expect(DefaultErrorSchema.safeParse(legacy).success).toBe(true);
		expect(DefaultErrorSchema.safeParse(unauthorized).success).toBe(false);
		expect(DefaultErrorSchema.safeParse(core).success).toBe(false);

		expect(UnauthorizedErrorSchema.safeParse(unauthorized).success).toBe(
			true
		);
		expect(UnauthorizedErrorSchema.safeParse(legacy).success).toBe(false);
		expect(UnauthorizedErrorSchema.safeParse(core).success).toBe(false);

		expect(CoreErrorSchema.safeParse(core).success).toBe(true);
		expect(CoreErrorSchema.safeParse(legacy).success).toBe(false);
		expect(CoreErrorSchema.safeParse(unauthorized).success).toBe(false);

		expect(TransportErrorSchema.safeParse("").success).toBe(true);
	});

	it("derives the runtime type from the schema", () => {
		const parsed = MidtransApiErrorSchema.parse({
			kind: "core",
			status_code: 402,
			status_message: "declined",
		});

		// Compile-time proof that the exported type is the inferred one.
		const typed: MidtransApiError = parsed;

		expect(typed.kind).toBe("core");
	});

	it("keeps the raw-consuming union and the model on the same type", () => {
		// Compile-time proof that both unions describe the same error.
		const same: AssertSame<
			MidtransApiError,
			z.infer<typeof ApiErrorSchema>
		> = true;

		expect(same).toBe(true);
	});

	it("exposes no public success rule that contradicts the runtime", () => {
		expect("HttpStatus" in schemaBarrel).toBe(false);
		expect(BUSINESS_SUCCESS_CODES.has("407")).toBe(true);
		expect(BUSINESS_SUCCESS_CODES.has("299")).toBe(false);
	});
});

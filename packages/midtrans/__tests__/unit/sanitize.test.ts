import { sanitizeFixtureBody } from "../../tools/sanitize";

describe("sanitizeFixtureBody", () => {
	it("redacts credentials, tokens and signed URLs", () => {
		const sanitized = sanitizeFixtureBody({
			signature_key: "abc123",
			order_id: "FIXTURE-1",
			transaction_id: "5f0c4a8e-1c2b-4a4f-9f3e-8f4a1c2d3e4f",
			merchant_id: "G123456789",
			token: "snap-token",
			va_numbers: [{ bank: "bca", va_number: "1111222233334444" }],
			redirect_url:
				"https://app.sandbox.midtrans.com/snap/v4/redirection/secret",
			pdf_url:
				"https://example.test/file.pdf?OSSAccessKeyId=STS&security-token=secret",
			metadata: { customer: "real" },
			customer_details: {
				name: "Real Name",
				email: "real@example.com",
				phone: "+628123456789",
			},
			payment_channels: [{ name: "credit_card", enabled: true }],
			item_details: [{ name: "Real product" }],
			notes: null,
		}) as Record<string, unknown>;

		const serialized = JSON.stringify(sanitized);

		expect(sanitized.signature_key).toBe("0".repeat(128));
		expect(sanitized.order_id).toBe("ORDER-REDACTED");
		expect(sanitized.transaction_id).toBe(
			"00000000-0000-4000-8000-000000000000"
		);
		expect(sanitized.merchant_id).toBe("G000000000");
		expect(sanitized.token).toBe("token-redacted");
		expect(sanitized.metadata).toEqual({});
		expect(sanitized.pdf_url).toBe("https://example.test/redacted.pdf");
		expect(serialized).not.toContain("abc123");
		expect(serialized).not.toContain("real@example.com");
		expect(serialized).not.toContain("Real Name");
		expect(serialized).not.toContain("OSSAccessKeyId");
		expect(serialized).not.toContain("security-token");
		expect(serialized).not.toContain("1111222233334444");
	});

	it("keeps non-sensitive names intact", () => {
		const sanitized = sanitizeFixtureBody({
			payment_channels: [{ name: "credit_card", enabled: true }],
			item_details: [{ name: "Real product" }],
			customer_details: { name: "Real Name" },
		}) as {
			payment_channels: Array<Record<string, unknown>>;
			item_details: Array<Record<string, unknown>>;
			customer_details: Record<string, unknown>;
		};

		expect(sanitized.payment_channels[0]?.name).toBe("credit_card");
		expect(sanitized.item_details[0]?.name).toBe("Real product");
		expect(sanitized.customer_details.name).toBe("Probe User");
	});

	it("preserves nulls and JSON types", () => {
		const sanitized = sanitizeFixtureBody({
			id: 42,
			bulk_upload_id: null,
			notes: null,
			payment_link_id: "link-1",
			signature_key: null,
		}) as Record<string, unknown>;

		expect(sanitized.id).toBe(1);
		expect(sanitized.bulk_upload_id).toBeNull();
		expect(sanitized.notes).toBeNull();
		expect(sanitized.payment_link_id).toBe("payment-link-redacted");
		expect(sanitized.signature_key).toBeNull();
	});
});

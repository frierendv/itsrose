import type { IncomingMessage } from "node:http";
import { generateRequestTrackingId } from "../src/commons/request-tracking";

describe("shared/fastify-utils", () => {
	describe("generateRequestTrackingId", () => {
		it("reuses existing request ID from header if present", () => {
			const req = {
				headers: {
					"x-request-id": "existing-id-123",
				},
			} as unknown as IncomingMessage;

			const id = generateRequestTrackingId(req);
			expect(id).toBe("existing-id-123");
		});

		it("generates new request tracking ID if headers are missing", () => {
			const req = {
				headers: {},
			} as unknown as IncomingMessage;

			const id = generateRequestTrackingId(req);
			expect(id).toBeDefined();
			expect(typeof id).toBe("string");
		});

		it("applies custom prefix to newly generated ID", () => {
			const req = {
				headers: {},
			} as unknown as IncomingMessage;

			const id = generateRequestTrackingId(req, { prefix: "req" });
			expect(id.startsWith("req_")).toBe(true);
		});
	});
});

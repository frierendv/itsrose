import { createSafeMailerHandler } from "../src/safe-send";

describe("createSafeMailerHandler", () => {
	it("reports failures instead of throwing", async () => {
		const errors: unknown[] = [];
		const handler = createSafeMailerHandler(
			async () => {
				throw new Error("provider unreachable");
			},
			(error) => errors.push(error)
		);

		await expect(handler()).resolves.toBeUndefined();
		expect(errors).toHaveLength(1);
		expect(String(errors[0])).toMatch(/provider unreachable/);
	});

	it("passes arguments through to the handler", async () => {
		const received: unknown[] = [];
		const handler = createSafeMailerHandler(async (value: string) => {
			received.push(value);
		});

		await handler("hello");
		expect(received).toEqual(["hello"]);
	});
});

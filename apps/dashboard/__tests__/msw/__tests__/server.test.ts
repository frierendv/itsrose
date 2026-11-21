import { config } from "@/config";
import { listGenerations } from "@/features/speech/api";
import { http, HttpResponse } from "msw";
import { server } from "../server";

const GENERATION = {
	generation_id: "gen_01",
	feature: "text_to_speech",
	status: "completed",
	input_text: "Hello there.",
	created_at: "2026-11-20T08:00:00.000Z",
	expires_at: "2026-11-21T08:00:00.000Z",
	saved: false,
	asset_id: null,
	expired: false,
};

function successEnvelope(data: unknown) {
	return {
		ok: true,
		code: 1000,
		message: "OK",
		data,
		errors: null,
		meta: {},
	};
}

describe("MSW server", () => {
	it("intercepts a real speech request and yields the parsed page", async () => {
		let requestedUrl = "";

		server.use(
			http.get(
				`${config.AUTH_BASE_URL}/studio/generations`,
				({ request }) => {
					requestedUrl = request.url;
					return HttpResponse.json(
						successEnvelope({
							items: [GENERATION],
							limit: 20,
							offset: 0,
						})
					);
				}
			)
		);

		const page = await listGenerations({ limit: 20, offset: 0 });

		expect(requestedUrl).toBe(
			`${config.AUTH_BASE_URL}/studio/generations?limit=20&offset=0`
		);
		expect(page.items).toHaveLength(1);
		expect(page.items[0]?.generation_id).toBe("gen_01");
		expect(page.limit).toBe(20);
	});
});

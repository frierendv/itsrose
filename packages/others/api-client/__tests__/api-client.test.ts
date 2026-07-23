import { APIClient, ItsRoseAPIClient } from "../src";
import { parseOptions, resolvePath } from "../src/client/utils";

type TestSchema = {
	"/users/{id}": {
		get: {
			parameters: { path: { id: string } };
			responses: {
				200: { content: { "application/json": { name: string } } };
			};
		};
	};
};

describe("others/api-client", () => {
	describe("resolvePath & parseOptions", () => {
		it("replaces path parameters in route templates", () => {
			const resolved = resolvePath("/users/{id}/posts/{postId}", {
				id: "user123",
				postId: "456",
			});
			expect(resolved).toBe("/users/user123/posts/456");
		});

		it("throws when a required path parameter is missing", () => {
			expect(() => resolvePath("/users/{id}", {})).toThrow(
				'Missing path param: "id"'
			);
		});

		it("parses request options and builds query / form payload", () => {
			const parsed = parseOptions("/users/{id}", {
				pathParams: { id: "123" },
				params: { active: true },
			});
			expect(parsed.url).toBe("/users/123");
			expect(parsed.params).toEqual({ active: true });
		});
	});

	describe("APIClient", () => {
		it("instantiates ItsRoseAPIClient", () => {
			const client = new ItsRoseAPIClient<TestSchema>({
				baseURL: "https://api.itsrose.rest",
			});
			expect(client).toBeDefined();
			expect(typeof client.get).toBe("function");
		});
	});
});

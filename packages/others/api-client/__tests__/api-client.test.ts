import { APIClient } from "../src";
import { parseOptions, resolvePath } from "../src/client/utils";

type TestSchema = {
	"/users/{id}": {
		get: {
			parameters: { path: { id: string } };
			responses: {
				200: { content: { "application/json": { name: string } } };
			};
		};
		post: {
			parameters: { path: { id: string } };
			requestBody: { content: { "application/json": { name: string } } };
			responses: {
				200: { content: { "application/json": { ok: boolean } } };
			};
		};
		put: {
			parameters: { path: { id: string } };
			responses: {
				200: { content: { "application/json": { ok: boolean } } };
			};
		};
		patch: {
			parameters: { path: { id: string } };
			responses: {
				200: { content: { "application/json": { ok: boolean } } };
			};
		};
		delete: {
			parameters: { path: { id: string } };
			responses: {
				200: { content: { "application/json": { ok: boolean } } };
			};
		};
	};
};

describe("others/api-client", () => {
	describe("resolvePath & parseOptions", () => {
		it("returns original path when pathParams is undefined", () => {
			expect(resolvePath("/users/all")).toBe("/users/all");
		});

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

		it("handles formData with Blob, form options, and custom formHandler", () => {
			// formData with default container containing a Blob
			const blob = new Blob(["test payload"], { type: "text/plain" });
			const resFormData = parseOptions("/upload", {
				formData: {
					text: "hello",
					num: 42,
					extra: undefined,
					obj: { a: 1 },
					file: blob,
				},
			});
			expect(resFormData.data).toBeInstanceOf(FormData);
			expect((resFormData.data as FormData).has("file")).toBe(true);

			// form with default URLSearchParams
			const resForm = parseOptions("/submit", {
				form: { query: "search", count: 10, empty: undefined },
			});
			expect(resForm.data).toBeInstanceOf(URLSearchParams);

			// Custom formHandler for formData
			const customForm = parseOptions("/upload", {
				formData: { key: "val" },
				formHandler: (data: any) => `custom:${JSON.stringify(data)}`,
			});
			expect(customForm.data).toBe('custom:{"key":"val"}');

			// Custom formHandler for form
			const customForm2 = parseOptions("/submit", {
				form: { key: "val" },
				formHandler: (data: any) => `custom:${JSON.stringify(data)}`,
			});
			expect(customForm2.data).toBe('custom:{"key":"val"}');
		});
	});

	describe("APIClient", () => {
		it("instantiates APIClient and invokes GET, POST, PUT, PATCH, DELETE", () => {
			const clientSpy = jest
				.spyOn(APIClient.prototype, "_request" as any)
				.mockImplementation(() => "executor" as any);

			const client = new APIClient<TestSchema>({
				baseURL: "https://api.itsrose.rest",
			});
			expect(client).toBeDefined();

			expect(client.GET("/users/{id}", { pathParams: { id: "1" } })).toBe(
				"executor"
			);
			expect(
				client.POST("/users/{id}", { pathParams: { id: "1" } })
			).toBe("executor");
			expect(client.PUT("/users/{id}", { pathParams: { id: "1" } })).toBe(
				"executor"
			);
			expect(
				client.PATCH("/users/{id}", { pathParams: { id: "1" } })
			).toBe("executor");
			expect(
				client.DELETE("/users/{id}", { pathParams: { id: "1" } })
			).toBe("executor");
			clientSpy.mockRestore();
		});
	});
});

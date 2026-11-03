export class APIError extends Error {
	public status: string;
	public body?: any;

	constructor(status: string, body?: any) {
		super(body?.message || status);
		this.name = "APIError";
		this.status = status;
		this.body = body;
	}
}

export const sessionMiddleware = (ctx: any) => ctx;

export function createAuthEndpoint(
	path: string,
	options: Record<string, any>,
	handler: (ctx: any) => Promise<any> | any
) {
	const endpoint = async (ctx: any) => {
		// If body validation schema is provided, validate
		if (
			options.body &&
			typeof options.body.parse === "function" &&
			ctx.body
		) {
			ctx.body = options.body.parse(ctx.body);
		}
		const res = await handler(ctx);
		if (
			res &&
			typeof res === "object" &&
			"data" in res &&
			"status" in res
		) {
			return res.data;
		}
		return res;
	};
	endpoint.path = path;
	endpoint.options = options;
	return endpoint;
}

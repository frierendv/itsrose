/**
 * Jest manual mock for `better-auth/api`.
 *
 * The mock keeps the runtime surface small (only what the package plugins
 * rely on) while exposing precise types so the mock itself stays free of
 * `any`.
 */

/** Body payload carried by an {@linkcode APIError}. */
type ApiErrorBody = {
	message?: string;
	code?: string;
	cause?: unknown;
} & Record<string, unknown>;

/** Schema-like object able to parse and validate a request body. */
type BodyParser = {
	parse: (value: unknown) => unknown;
};

/** Endpoint options accepted by {@linkcode createAuthEndpoint}. */
type EndpointOptions = {
	body?: BodyParser;
	[key: string]: unknown;
};

/** Endpoint context handed to the endpoint handler. */
type EndpointContext = {
	body?: unknown;
	[key: string]: unknown;
};

/** Handler executed by the mocked endpoint. */
type EndpointHandler = (ctx: EndpointContext) => unknown | Promise<unknown>;

/** The mocked endpoint: a callable carrying its path and options. */
type AuthEndpoint = ((ctx: EndpointContext) => Promise<unknown>) & {
	path: string;
	options: EndpointOptions;
};

/** Envelope returned by `ctx.json()` style handlers. */
type ResponseEnvelope = {
	data: unknown;
	status: unknown;
};

const isResponseEnvelope = (value: unknown): value is ResponseEnvelope =>
	typeof value === "object" &&
	value !== null &&
	"data" in value &&
	"status" in value;

export class APIError extends Error {
	public status: string;
	public body?: ApiErrorBody;

	constructor(status: string, body?: ApiErrorBody) {
		super(body?.message || status);
		this.name = "APIError";
		this.status = status;
		this.body = body;
	}
}

export const sessionMiddleware = <TContext>(ctx: TContext): TContext => ctx;

export function createAuthEndpoint(
	path: string,
	options: EndpointOptions,
	handler: EndpointHandler
): AuthEndpoint {
	const endpoint = Object.assign(
		async (ctx: EndpointContext): Promise<unknown> => {
			// If body validation schema is provided, validate
			const bodyParser = options.body;
			if (
				bodyParser &&
				typeof bodyParser.parse === "function" &&
				ctx.body
			) {
				ctx.body = bodyParser.parse(ctx.body);
			}
			const res = await handler(ctx);
			if (isResponseEnvelope(res)) {
				return res.data;
			}
			return res;
		},
		{ path, options }
	);

	return endpoint;
}

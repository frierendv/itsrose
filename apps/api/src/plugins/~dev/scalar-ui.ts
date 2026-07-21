import fastifyApiReference, {
	type FastifyApiReferenceOptions,
} from "@scalar/fastify-api-reference";

export const autoConfig: FastifyApiReferenceOptions = {
	routePrefix: "/docs",
	configuration: {
		title: "Our API Reference",
		url: "/openapi.json",

		defaultHttpClient: {
			targetKey: "node",
			clientKey: "axios",
		},
		agent: {
			disabled: true,
		},
		persistAuth: false,
	},
};

export default fastifyApiReference;

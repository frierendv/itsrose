import { config } from "@/shared/config";
import { ApiReference } from "@scalar/nextjs-api-reference";

const BASE_URL_API_DOMAIN = config.ITSROSE_API_BASE_URL;
const OPENAPI_URL = new URL("/openapi.json", BASE_URL_API_DOMAIN);

const scalarConfig = {
	pageTitle: "ItsRose API Reference",
	metaData: {
		title: "ItsRose API Reference",
		description:
			"Comprehensive documentation and reference for the ItsRose API, including endpoints, authentication, and usage examples.",
	},
	servers: [
		{
			url: BASE_URL_API_DOMAIN.href,
			description: "Production server",
		},
	],
	url: OPENAPI_URL.href,
	authentication: {
		preferredSecurityScheme: "bearerAuth",
		securitySchemes: {
			bearerAuth: {
				name: "Authorization",
				in: "header",
				scheme: "bearer",
				bearerFormat: "JWT",
				description:
					"API key authentication. Use the `Bearer` prefix followed by your API key.",
			},
		},
	},
	_integration: "nextjs",
	hideClientButton: true,
} satisfies Parameters<typeof ApiReference>[0];

export const GET = ApiReference(scalarConfig);

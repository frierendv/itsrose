/**
 * Server Error Codes
 */
export const SERVER_ERROR = {
	INTERNAL_ERROR: {
		code: 3000,
		message: "Internal server error occurred",
		http_code: 500,
	},
	UNHANDLED_EXCEPTION: {
		code: 3001,
		message: "Unhandled exception occurred",
		http_code: 500,
	},
	SERVICE_UNAVAILABLE: {
		code: 3002,
		message: "Service is temporarily unavailable",
		http_code: 503,
	},
	NOT_IMPLEMENTED: {
		code: 3003,
		message: "Requested functionality is not implemented",
		http_code: 501,
	},
	BAD_GATEWAY: {
		code: 3004,
		message: "Bad gateway or invalid response from upstream server",
		http_code: 502,
	},
	GATEWAY_TIMEOUT: {
		code: 3005,
		message: "Upstream server failed to respond in time",
		http_code: 504,
	},
	HTTP_VERSION_NOT_SUPPORTED: {
		code: 3006,
		message: "HTTP version used in request is not supported",
		http_code: 505,
	},
	VARIANT_ALSO_NEGOTIATES: {
		code: 3007,
		message: "Transparent content negotiation error",
		http_code: 506,
	},
	INSUFFICIENT_STORAGE: {
		code: 3008,
		message: "Insufficient server storage to complete request",
		http_code: 507,
	},
	LOOP_DETECTED: {
		code: 3009,
		message: "Infinite loop detected while processing request",
		http_code: 508,
	},
	NETWORK_AUTHENTICATION_REQUIRED: {
		code: 3010,
		message: "Network authentication required",
		http_code: 511,
	},
	DATABASE_ERROR: {
		code: 3100,
		message: "Database operation failed",
		http_code: 500,
	},
	CACHE_ERROR: {
		code: 3101,
		message: "Cache store operation failed",
		http_code: 500,
	},
	QUEUE_ERROR: {
		code: 3102,
		message: "Message queue operation failed",
		http_code: 500,
	},
	EXTERNAL_SERVICE_ERROR: {
		code: 3200,
		message: "External service request failed",
		http_code: 502,
	},
	TIMEOUT: {
		code: 3300,
		message: "Request processing timeout",
		http_code: 504,
	},
} as const;

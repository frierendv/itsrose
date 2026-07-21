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
	DATABASE_ERROR: {
		code: 3100,
		message: "Database operation failed",
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

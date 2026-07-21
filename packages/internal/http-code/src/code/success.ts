/**
 * Success Code
 */
export const SUCCESS = {
	OK: {
		code: 1000,
		message: "Request successful",
		http_code: 200,
	},
	CREATED: {
		code: 1001,
		message: "Resource created",
		http_code: 201,
	},
	UPDATED: {
		code: 1002,
		message: "Resource updated",
		http_code: 200,
	},
	DELETED: {
		code: 1003,
		message: "Resource deleted",
		http_code: 200,
	},
	ACCEPTED: {
		code: 1004,
		message: "Request accepted and processing",
		http_code: 202,
	},
	PARTIAL_SUCCESS: {
		code: 1005,
		message: "Request partially completed with warnings",
		http_code: 200,
	},
} as const;

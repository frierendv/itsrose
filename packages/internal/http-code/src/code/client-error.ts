/**
 * Client Error
 */
export const CLIENT_ERROR = {
	VALIDATION_ERROR: {
		code: 2001,
		message: "Request validation failed",
		http_code: 400,
	},
	INVALID_REQUEST: {
		code: 2002,
		message: "Invalid or malformed request",
		http_code: 400,
	},
	MISSING_REQUIRED_FIELD: {
		code: 2003,
		message: "Required field is missing",
		http_code: 400,
	},
	INVALID_FORMAT: {
		code: 2004,
		message: "Data format is invalid",
		http_code: 400,
	},
	UNAUTHORIZED: {
		code: 2101,
		message: "Authentication required or invalid",
		http_code: 401,
	},
	INVALID_CREDENTIALS: {
		code: 2102,
		message: "Invalid credentials provided",
		http_code: 401,
	},
	TOKEN_EXPIRED: {
		code: 2103,
		message: "Authentication token has expired",
		http_code: 401,
	},
	TOKEN_INVALID: {
		code: 2104,
		message: "Authentication token is invalid",
		http_code: 401,
	},
	FORBIDDEN: {
		code: 2201,
		message: "Access denied - insufficient permissions",
		http_code: 403,
	},
	PERMISSION_DENIED: {
		code: 2202,
		message: "Operation not permitted for this resource",
		http_code: 403,
	},
	NOT_FOUND: {
		code: 2301,
		message: "Requested resource not found",
		http_code: 404,
	},
	RESOURCE_NOT_FOUND: {
		code: 2302,
		message: "The specified resource does not exist",
		http_code: 404,
	},
	CONFLICT: {
		code: 2401,
		message: "Request conflicts with current resource state",
		http_code: 409,
	},
	DUPLICATE_RESOURCE: {
		code: 2402,
		message: "Resource already exists",
		http_code: 409,
	},
	VERSION_CONFLICT: {
		code: 2403,
		message: "Resource version mismatch - concurrent modification detected",
		http_code: 409,
	},
	RATE_LIMITED: {
		code: 2501,
		message: "Too many requests - rate limit exceeded",
		http_code: 429,
	},
	QUOTA_EXCEEDED: {
		code: 2502,
		message: "Resource quota has been exceeded",
		http_code: 429,
	},
} as const;

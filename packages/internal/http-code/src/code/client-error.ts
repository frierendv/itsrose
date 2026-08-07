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
	BAD_REQUEST: {
		code: 2005,
		message: "Bad request syntax or invalid parameters",
		http_code: 400,
	},
	MALFORMED_JSON: {
		code: 2006,
		message: "Malformed JSON payload in request body",
		http_code: 400,
	},
	INVALID_HEADER: {
		code: 2007,
		message: "Invalid or missing HTTP request header",
		http_code: 400,
	},
	INVALID_QUERY_PARAM: {
		code: 2008,
		message: "Invalid query parameter provided",
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
	TOKEN_MISSING: {
		code: 2105,
		message: "Authentication token is missing",
		http_code: 401,
	},
	SESSION_EXPIRED: {
		code: 2106,
		message: "User session has expired",
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
	ACCESS_DENIED: {
		code: 2203,
		message: "Access denied for this resource",
		http_code: 403,
	},
	ACCOUNT_DISABLED: {
		code: 2204,
		message: "Account has been disabled or suspended",
		http_code: 403,
	},
	IP_BLOCKED: {
		code: 2205,
		message: "Access blocked from current IP address",
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
	ROUTE_NOT_FOUND: {
		code: 2303,
		message: "Requested route or endpoint does not exist",
		http_code: 404,
	},
	USER_NOT_FOUND: {
		code: 2304,
		message: "Specified user was not found",
		http_code: 404,
	},
	METHOD_NOT_ALLOWED: {
		code: 2351,
		message: "HTTP method is not allowed for this endpoint",
		http_code: 405,
	},
	NOT_ACCEPTABLE: {
		code: 2352,
		message: "Cannot generate response matching Accept headers",
		http_code: 406,
	},
	REQUEST_TIMEOUT: {
		code: 2353,
		message: "Request processing timed out by client",
		http_code: 408,
	},
	GONE: {
		code: 2354,
		message: "Requested resource is permanently unavailable",
		http_code: 410,
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
	ALREADY_EXISTS: {
		code: 2404,
		message: "Resource or entry already exists",
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
	TOO_MANY_REQUESTS: {
		code: 2503,
		message: "Too many requests submitted",
		http_code: 429,
	},
	PRECONDITION_FAILED: {
		code: 2601,
		message: "One or more request preconditions failed",
		http_code: 412,
	},
	PAYLOAD_TOO_LARGE: {
		code: 2602,
		message: "Request payload exceeds maximum allowed size",
		http_code: 413,
	},
	UNSUPPORTED_MEDIA_TYPE: {
		code: 2603,
		message: "Unsupported media type or Content-Type header",
		http_code: 415,
	},
	RANGE_NOT_SATISFIABLE: {
		code: 2604,
		message: "Requested byte range cannot be satisfied",
		http_code: 416,
	},
	PRECONDITION_REQUIRED: {
		code: 2605,
		message: "Server requires request to be conditional",
		http_code: 428,
	},
	HEADER_FIELDS_TOO_LARGE: {
		code: 2606,
		message: "Request header fields are too large",
		http_code: 431,
	},
	UNAVAILABLE_FOR_LEGAL_REASONS: {
		code: 2607,
		message: "Resource is unavailable due to legal demands",
		http_code: 451,
	},
} as const;

/**
 * Business Error Codes
 */
export const BUSINESS_ERROR = {
	RULE_VIOLATION: {
		code: 4000,
		message: "Rule violation occurred",
		http_code: 422,
	},
	INVALID_STATE_TRANSITION: {
		code: 4001,
		message: "Invalid state transition for this resource",
		http_code: 422,
	},
	INSUFFICIENT_BALANCE: {
		code: 4010,
		message: "Insufficient balance to complete this operation",
		http_code: 422,
	},
	OPERATION_NOT_ALLOWED: {
		code: 4011,
		message: "This operation is not allowed",
		http_code: 422,
	},
	PREREQUISITE_NOT_MET: {
		code: 4012,
		message: "Required prerequisite conditions not met",
		http_code: 422,
	},
	RESOURCE_EXHAUSTED: {
		code: 4013,
		message: "Required resource is exhausted",
		http_code: 422,
	},
	CONSTRAINT_VIOLATION: {
		code: 4020,
		message: "Data constraint violation",
		http_code: 422,
	},
	DEPENDENCY_ERROR: {
		code: 4030,
		message: "Operation has unresolved dependencies",
		http_code: 422,
	},
} as const;

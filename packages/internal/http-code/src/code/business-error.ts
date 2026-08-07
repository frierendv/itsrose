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
	UNPROCESSABLE_ENTITY: {
		code: 4002,
		message: "Unable to process contained instructions",
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
	ACCOUNT_UNVERIFIED: {
		code: 4014,
		message: "Account email or identity is not verified",
		http_code: 422,
	},
	SUBSCRIPTION_REQUIRED: {
		code: 4015,
		message: "Active subscription required for this feature",
		http_code: 402,
	},
	PAYMENT_REQUIRED: {
		code: 4016,
		message: "Payment required to proceed",
		http_code: 402,
	},
	EXPIRED_ACTION: {
		code: 4017,
		message: "Requested action link or token has expired",
		http_code: 422,
	},
	LIMIT_EXCEEDED: {
		code: 4018,
		message: "Operational limit exceeded",
		http_code: 422,
	},
	WORKFLOW_CANCELLED: {
		code: 4019,
		message: "Task or workflow execution was cancelled",
		http_code: 422,
	},
	CONSTRAINT_VIOLATION: {
		code: 4020,
		message: "Data constraint violation",
		http_code: 422,
	},
	RESOURCE_LOCKED: {
		code: 4021,
		message: "Resource is locked and unavailable for editing",
		http_code: 423,
	},
	DEPENDENCY_ERROR: {
		code: 4030,
		message: "Operation has unresolved dependencies",
		http_code: 422,
	},
	FAILED_DEPENDENCY: {
		code: 4031,
		message: "Request failed due to failure of a previous request",
		http_code: 424,
	},
} as const;

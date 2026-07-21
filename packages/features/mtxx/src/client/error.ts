export type ErrorMap = {
	[key: number]: {
		message: string;
		statusCode: number;
	};
};

export const ERROR_MAP: ErrorMap = {
	50099: { message: "Task timeout.", statusCode: 408 },
	10000: { message: "Invalid parameter.", statusCode: 400 },
	10002: { message: "The request timed out.", statusCode: 408 },
	10003: { message: "Image download failed.", statusCode: 400 },
	10004: { message: "Task not found.", statusCode: 404 },
	10005: { message: "SO library error.", statusCode: 500 },
	10006: { message: "Content error.", statusCode: 400 },
	10007: { message: "Image decoding error.", statusCode: 400 },
	10008: { message: "Image encoding error.", statusCode: 400 },
	10009: { message: "Image processing error.", statusCode: 400 },
	10010: {
		message: "The LENTP image is parsed incorrectly",
		statusCode: 400,
	},
	10011: { message: "Shared memory error.", statusCode: 500 },
	10012: { message: "Image length error.", statusCode: 400 },
	10013: { message: "Base64 decoding error.", statusCode: 400 },
	10014: { message: "URL decoding error.", statusCode: 400 },
	10015: {
		message:
			"The GPU/video memory resources are insufficient, and the service is temporarily unavailable",
		statusCode: 503,
	},
	10016: { message: "Image slicing error.", statusCode: 400 },
	10017: { message: "Image merging error.", statusCode: 400 },
	10018: { message: "FPGA processing error.", statusCode: 500 },
	10019: { message: "FPGA processing timeout.", statusCode: 408 },
	10024: { message: "Unknown error.", statusCode: 500 },
	10025: {
		message:
			"The generated/input is inappropriate, please try other image.",
		statusCode: 400,
	},
	10026: {
		message:
			"The generated/input is inappropriate, please try other image.",
		statusCode: 400,
	},
	10027: {
		message:
			"The generated/input is inappropriate, please try other image.",
		statusCode: 400,
	},
	11002: { message: "The client process is abnormal.", statusCode: 500 },
	20001: {
		message:
			"Can't process the image, make sure the image/parameter is in the right format",
		statusCode: 400,
	},
	20003: { message: "No face detected.", statusCode: 400 },
	20009: { message: "Unsupported type.", statusCode: 400 },
	21205: { message: "Image download failed.", statusCode: 400 },

	// NETWORK_ERROR
	21204: { message: "Network error.", statusCode: 503 },

	// GATEWAY_AUTHORIZED_ERROR
	90002: { message: "Gateway authorization failed.", statusCode: 401 },
	// Failed to download the image, please check the image URL and try again.
	21202: {
		message:
			"Failed to download the image, please check the image URL and try again.",
		statusCode: 400,
	},
};

export const DEFAULT_ERROR = {
	message: "An unknown error occurred. Please try again later.",
	statusCode: 500,
};

/**
 * Processing status of a Remini image enhancement task.
 */
type ReminiTaskStatus = "completed" | "failed" | "processing";

/**
 * Error detail returned by Remini task processing.
 */
export type ReminiError = {
	/** Machine-readable error reason. */
	error_reason: string;
	/** Human-readable error description or null. */
	error_description: string | null;
};

/**
 * Result payload containing converted image URLs and expiration details.
 */
export type ReminiTaskResult = {
	/** Input image URL. */
	input_url: string;
	/** Expiration timestamp string. */
	expire_at: string;
	/** Array of output image objects. */
	outputs: { url: string }[];
};

/**
 * Full task response emitted by Remini tasks.
 */
export type ReminiTaskResponse = {
	status: ReminiTaskStatus;
	result: ReminiTaskResult | null;
	error: ReminiError | null;
} & (
	| {
			status: "completed";
			result: ReminiTaskResult;
			error: null;
	  }
	| {
			status: "failed";
			result: null;
			error: ReminiError;
	  }
	| {
			status: "processing";
			result: null;
			error: null;
	  }
);

/**
 * Initial setup response structure returned by Remini Oracle authentication service.
 */
export type OracleSetupResponse = {
	me: {
		/** Unique user ID used in header `oracle-user-id`. */
		unique_id: string;
		authentication: {
			identity_token: string;
			refresh_token: string | null;
			auth_url: string;
		};
	};
	settings: {
		__identity__: {
			token: string;
			expiration: string;
		};
	};
	default_settings_url: string;
	overrides_url: string;
};

/**
 * Active Oracle user authentication state and tokens.
 */
export type CurrentOracleUser = Pick<
	OracleSetupResponse["me"],
	"unique_id" | "authentication"
> & {
	identity: { token: string; expiration: number };
};

export type CurrentUserAccount = {
	image_training_consent: boolean;
	image_training_consent_version: null | unknown;
	balance: number;
	next_renew_balance_seconds: number;
};

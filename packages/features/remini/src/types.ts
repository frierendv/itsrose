type ReminiTaskStatus = "completed" | "failed" | "processing";

export type ReminiError = {
	error_reason: string;
	error_description: string | null;
};
export type ReminiTaskResult = {
	input_url: string;
	expire_at: string;
	outputs: { url: string }[];
};
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
export type OracleSetupResponse = {
	me: {
		/** as `oracle-user-id` in iris headers */
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

export type OracleUser = Pick<
	OracleSetupResponse["me"],
	"unique_id" | "authentication"
> & {
	identity: { token: string; expiration_: number };
};

import type { Client } from ".";
import { UpstreamApiError } from "@itsrose/upstream-client";
import type { CurrentOracleUser, OracleSetupResponse } from "../types";
import { createAId, createOracleConfig, type OracleConfig } from "../utils";

export class Oracle {
	private _currentOracleUser?: CurrentOracleUser;
	private initPromise?: Promise<void>;

	protected _oracleHeaders?: OracleConfig;
	protected _oracleInitialized: boolean = false;
	/** Cache combined headers to avoid recreating objects on every patch/get */
	private _cachedHeaders?: Record<string, string>;

	public oracleAid: string;
	constructor(private readonly client: Client) {
		this.oracleAid = createAId();
		this._oracleHeaders = createOracleConfig(this.oracleAid);
	}

	public async initialize(first = true): Promise<void> {
		if (this._oracleInitialized) {
			return;
		}

		if (this.initPromise) {
			return this.initPromise;
		}

		this.initPromise = (async () => {
			const options = { headers: this._oracleHeaders };
			let data: OracleSetupResponse | undefined;
			try {
				data = await this.client.send<OracleSetupResponse>({
					url: "/v1/mobile/oracle/setup",
					...options,
				});
			} catch (error) {
				throw new UpstreamApiError(
					"Failed to initialize remini.",
					500,
					{ service: "remini", cause: error }
				);
			}
			if (!data) {
				throw new UpstreamApiError(
					"Failed to initialize remini.",
					500,
					{ service: "remini" }
				);
			}

			// if first
			if (first) {
				// The two notices are acknowledgements: a failure to record
				// one does not stop the setup, exactly as before.
				await Promise.all([
					this.client
						.send({
							url: "/v1/mobile/oracle/terms-of-service",
							method: "post",
							data: { version: "2.3.0" },
							...options,
						})
						.catch(() => undefined),
					this.client
						.send({
							url: "/v1/mobile/oracle/privacy-notice",
							method: "post",
							data: { version: "3.12.0" },
							...options,
						})
						.catch(() => undefined),
				]);
			}

			await this.storeOracleData(data);
			this._patchClientHeader();
			this._oracleInitialized = true;
		})();

		try {
			await this.initPromise;
		} finally {
			this.initPromise = undefined;
		}
	}

	public async refresh(): Promise<void> {
		this._oracleInitialized = false;
		this._cachedHeaders = undefined;
		return this.initialize(false);
	}

	private _patchClientHeader() {
		const headers = this.getHeaders();
		this.client.setDefaultHeaders(headers);
	}

	/**
	 * @public
	 * @returns {Record<string, string>}
	 */
	public getHeaders(): Record<string, string> {
		if (this._cachedHeaders) {
			return this._cachedHeaders;
		}
		const token = this._currentOracleUser?.identity.token ?? "";
		const merged = {
			...this._oracleHeaders,
			"Identity-Token": token,
			"Iris-Access-Token": token,
		} as Record<string, string>;
		this._cachedHeaders = merged;
		return merged;
	}

	private async storeOracleData(data: OracleSetupResponse) {
		const { me, settings } = data;
		const identity: CurrentOracleUser["identity"] = {
			token: settings.__identity__.token,
			expiration: new Date(settings.__identity__.expiration).getTime(),
		};
		const { unique_id, authentication } = me;

		this._currentOracleUser = {
			unique_id,
			authentication,
			identity,
		};

		// update cached headers whenever identity changes
		this._cachedHeaders = {
			...this._oracleHeaders,
			"Identity-Token": identity.token,
			"Iris-Access-Token": identity.token,
		};
	}

	/**
	 * Ensures that Oracle is initialized and identity token is not expired.
	 * Automatically initializes or refreshes as needed.
	 */
	public async ensureValidToken(): Promise<void> {
		if (!this._oracleInitialized) {
			await this.initialize();
		} else if (this.isTokenExpired) {
			await this.refresh();
		}
	}

	public get initialized() {
		return this._oracleInitialized;
	}

	public get currentOracleUser() {
		return this._currentOracleUser;
	}

	public get isTokenExpired() {
		if (!this._currentOracleUser) {
			return true;
		}
		return (
			Date.now() >= this._currentOracleUser.identity.expiration - 60_000
		);
	}
}

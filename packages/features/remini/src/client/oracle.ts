import type { Client } from ".";
import { ThirdPartyApiError } from "@itsrose/system";
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
	}

	public async initialize(first = true): Promise<void> {
		if (this._oracleInitialized) {
			return;
		}

		if (this.initPromise) {
			return this.initPromise;
		}

		this.initPromise = (async () => {
			this._oracleHeaders = createOracleConfig(this.oracleAid);
			const options = { headers: this._oracleHeaders };
			const { data, error } =
				await this.client.http.get<OracleSetupResponse>(
					"/v1/mobile/oracle/setup",
					options
				);
			if (error || !data) {
				throw new ThirdPartyApiError(
					"Failed to initialize remini.",
					500
				);
			}

			// if first
			if (first) {
				await Promise.all([
					this.client.http.post(
						"/v1/mobile/oracle/terms-of-service",
						{ version: "2.3.0" },
						options
					),
					this.client.http.post(
						"/v1/mobile/oracle/privacy-notice",
						{ version: "3.12.0" },
						options
					),
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
		Object.assign(this.client.http.defaults.headers.common, headers);
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

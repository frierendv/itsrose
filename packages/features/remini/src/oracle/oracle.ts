import type { HttpClient } from "@itsrose/http-client";
import type { OracleSetupResponse, OracleUser } from "../types";
import { createAIdContext } from "./context";
import { createOracleConfig, type OracleConfig } from "./oracle-config";

export class Oracle {
	private _user: OracleUser;

	private aId: string;
	protected _oracleHeaders: OracleConfig;
	protected _oracleInitialized: boolean = false;
	/** Cache combined headers to avoid recreating objects on every patch/get */
	private _cachedHeaders?: Record<string, string>;

	constructor(private readonly client: HttpClient) {
		this._user = {} as OracleUser;
		this.aId = createAIdContext();
		this._oracleHeaders = createOracleConfig(this.aId);
	}

	private _onError(_error: any, _statusCode?: number) {
		return { message: "Remini setup error." };
	}

	public async initialize(): Promise<void> {
		const options = { headers: this._oracleHeaders };
		const { data, error } = await this.client
			.get<OracleSetupResponse>("/v1/mobile/oracle/setup", options)
			.onError(this._onError);
		if (error) {
			throw new Error(error.message);
		}

		this.setUser = data;
		this._patchClientHeader();
		this._oracleInitialized = true;
	}

	private _patchClientHeader() {
		// reuse cached headers when available to reduce allocations
		const headers = this._cachedHeaders ?? this.getHeaders();
		Object.assign(this.client.defaults.headers.common, headers);
	}

	/**
	 * @public
	 * @returns {Record<string, string>}
	 */
	public getHeaders(): Record<string, string> {
		if (this._cachedHeaders) {
			return this._cachedHeaders;
		}
		const merged = {
			...this._oracleHeaders,
			"Identity-Token": this.oracleUserIdentity.token,
		} as Record<string, string>;
		this._cachedHeaders = merged;
		return merged;
	}

	private set setUser(data: OracleSetupResponse) {
		const { me, settings } = data;
		const identity: OracleUser["identity"] = {
			token: settings.__identity__.token,
			expiration_: new Date(settings.__identity__.expiration).getTime(),
		};
		const { unique_id, authentication } = me;
		this._user = { unique_id, authentication, identity };
		// update cached headers whenever identity changes
		this._cachedHeaders = {
			...this._oracleHeaders,
			"Identity-Token": identity.token,
		};
	}

	public get oracleInitialized() {
		return this._oracleInitialized;
	}
	public get oracleUserId() {
		return this._user.unique_id;
	}
	public get oracleUserAuth() {
		return this._user.authentication;
	}
	public get oracleUserIdentity() {
		return this._user.identity;
	}
}

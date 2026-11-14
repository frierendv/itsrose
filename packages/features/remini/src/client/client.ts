import { getEnv } from "@itsrose/system";
import { createUpstreamClient, UpstreamClient } from "@itsrose/upstream-client";
import { REMINI_ENV } from "../env";
import { Iris } from "./iris";
import { Oracle } from "./oracle";
import { Task } from "./task";
import { User } from "./user";

export class Client extends UpstreamClient {
	public baseUrl: string;
	public wssBaseUrl: string;

	public user: User;
	public oracle: Oracle;
	public iris: Iris;
	/**
	 * Task sub-class
	 *
	 * @public
	 * @type {Task}
	 */
	public task: Task;

	private initPromise?: Promise<void>;

	constructor() {
		const baseUrl = getEnv(REMINI_ENV.apiBaseUrl, {
			isRequired: true,
		});
		const wssBaseUrl = getEnv(REMINI_ENV.wssBaseUrl, {
			isRequired: true,
		});
		super({ service: "remini", baseURL: baseUrl });
		this.baseUrl = baseUrl;
		this.wssBaseUrl = wssBaseUrl;

		this.oracle = new Oracle(this);
		this.iris = new Iris(this);
		this.user = new User(this);
		this.task = new Task(this);
	}

	/**
	 * Ensure Oracle setup and valid token state.
	 */
	public async ensureInitialized(): Promise<void> {
		if (this.initPromise) {
			return this.initPromise;
		}

		this.initPromise = (async () => {
			await this.oracle.ensureValidToken();
		})();

		try {
			await this.initPromise;
		} finally {
			this.initPromise = undefined;
		}
	}

	/**
	 * Ping remini server
	 *
	 * @returns {Promise<unknown>}
	 */
	async ping(): Promise<unknown> {
		return this.send<string>({ url: "/system/ping" });
	}
}

/**
 * The client the package downloads input images with.
 *
 * The images live on other hosts, so this client carries no origin and no
 * credentials.
 */
export const assetClient = createUpstreamClient({
	service: "remini-assets",
});

let defaultClient: Client | undefined;

/**
 * Initialized remini client instance (lazily initialized upon first access).
 */
export const client: Client = new Proxy(Object.create(Client.prototype), {
	get(_target, prop, receiver) {
		defaultClient ??= new Client();
		const value = Reflect.get(defaultClient, prop, receiver);
		return typeof value === "function" ? value.bind(defaultClient) : value;
	},
	set(_target, prop, value, receiver) {
		defaultClient ??= new Client();
		return Reflect.set(defaultClient, prop, value, receiver);
	},
});

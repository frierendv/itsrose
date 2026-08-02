import { createHttpClient, type HttpClient } from "@itsrose/http-client";
import { getEnv } from "@itsrose/system";
import { Iris } from "./iris";
import { Oracle } from "./oracle";
import { Task } from "./task";
import { User } from "./user";

export class Client {
	public baseUrl: string;
	public wssBaseUrl: string;

	public http: HttpClient;
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
		this.baseUrl = getEnv("REMINI_API_BASE_URL", {
			isRequired: true,
		});
		this.wssBaseUrl = getEnv("REMINI_WSS_BASE_URL", {
			isRequired: true,
		});
		this.http = createHttpClient({
			baseURL: this.baseUrl,
		});

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
		const { data } = await this.http.get<"pong">("/system/ping");
		return data;
	}
}

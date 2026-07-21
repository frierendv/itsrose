import { createHttpClient, type HttpClient } from "@itsrose/http-client";
import { Oracle } from "../oracle";
import { REMINI_API_BASE_URL } from "./config";
import { Task } from "./task";

export class ReminiClient {
	public http: HttpClient;
	public oracle: Oracle;

	constructor() {
		this.http = createHttpClient({
			baseURL: REMINI_API_BASE_URL,
		});
		this.oracle = new Oracle(this.http);
		this.oracle.initialize();
	}

	/**
	 *
	 * @public
	 * @type {Task}
	 */
	public task: Task = new Task(this);

	/**
	 *
	 * @async
	 */
	async getMe() {
		return this.http.get("/v1/mobile/users/@me");
	}

	/**
	 *
	 * @async
	 */
	async ping() {
		return this.http.get("/system/ping");
	}
}

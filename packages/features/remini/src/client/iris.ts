import { randomUUID } from "crypto";
import { COMMON, DEVICE } from "../constant";
import type { Client } from "./client";

export class Iris {
	private nonces: string[];
	private irisCounter: number;

	private accessToken?: string;

	constructor(private readonly client: Client) {
		this.irisCounter = 0;
		this.nonces = [randomUUID(), randomUUID()];
	}

	public async getAccessToken(): Promise<string> {
		if (this.accessToken) {
			return this.accessToken;
		}
		const oracleToken =
			this.client.oracle.currentOracleUser?.identity?.token;
		if (oracleToken) {
			this.accessToken = oracleToken;
			return oracleToken;
		}
		return "";
	}

	public getDeviceMetadata(): DeviceMetadata {
		return {
			board: DEVICE["Device-Model"],
			bootloader: "unknown",
			brand: DEVICE["Device-Manufacturer"],
			country: COMMON["Country"],
			fingerprint: "",
			host: "UNBK",
			id: "",
			is_system_user: true,
			language: COMMON["Language"],
			manufacturer: DEVICE["Device-Manufacturer"],
			model: DEVICE["Device-Model"],
			sdk_version: Number(DEVICE["OS-Version"]),
			security_patch_date: "2019-07-05",
			supports_multiple_users: true,
			timezone: COMMON["Timezone"],
		};
	}

	public getHeaders() {
		this.irisCounter += 1;
		const token =
			this.accessToken ||
			this.client.oracle.currentOracleUser?.identity?.token ||
			"";
		return {
			"Iris-Access-Token": token,
			"Iris-Nonces": this.nonces.join(","),
			"Iris-Nonces-Counter": this.irisCounter,
		};
	}
}

type DeviceMetadata = {
	board: string;
	bootloader: string;
	brand: string;
	country: string;
	fingerprint: string;
	host: string;
	id: string;
	is_system_user: boolean;
	language: string;
	manufacturer: string;
	model: string;
	sdk_version: number;
	security_patch_date: string;
	supports_multiple_users: boolean;
	timezone: string;
};

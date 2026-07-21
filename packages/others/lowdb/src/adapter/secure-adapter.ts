import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import { readFile, writeFile } from "atomically";
import type { AnyRecordValue, IAdapter } from "../types";
import { isNotFoundOrNotDir } from "../utils";
import { Adapter, type IAdapterOptions } from "./adapter";

export interface ICryptoAdapterOptions<
	T extends AnyRecordValue,
> extends IAdapterOptions<T> {
	/**
	 * Secret key `[32]`
	 *
	 * @type {string}
	 */
	secretKey: string;
	algorithm?: "aes-256-ctr";
}

/**
 * Handles collection-based key-value storage with AES-256-CTR encryption
 *
 * @template {AnyRecordValue} T
 * @extends {Adapter<T>}
 */
export class CryptoAdapter<T extends AnyRecordValue>
	extends Adapter<T>
	implements Omit<IAdapter<T>, "delete" | "keys" | "entries">
{
	#secretKey: Buffer;
	#algorithm: "aes-256-ctr";
	/**
	 * Creates an instance of CryptoAdapter.
	 *
	 * @param {ICryptoAdapterOptions<T>} options
	 */
	constructor(options: ICryptoAdapterOptions<T>) {
		const { secretKey, algorithm = "aes-256-ctr", ...rest } = options;
		super(rest);
		this.#algorithm = algorithm;
		if (Buffer.isBuffer(secretKey)) {
			if (secretKey.length !== 32) {
				throw new Error(
					"Raw Buffer keys must be exactly 32 bytes long."
				);
			}
			this.#secretKey = secretKey;
		} else {
			// SHA-256 natively outputs a predictable 32-byte digest
			this.#secretKey = crypto
				.createHash("sha256")
				.update(String(secretKey))
				.digest();
		}
		// Object.assign(options, { secretKey: "[REDACTED]" });
	}
	protected async _encrypt(value: T) {
		const iv = crypto.randomBytes(16);
		const cipher = crypto.createCipheriv(
			this.#algorithm,
			this.#secretKey,
			iv
		);
		/**
		 * Encrypt the payload.
		 */
		const payload = await this.stringify(value);
		const encrypted = Buffer.concat([
			cipher.update(payload, "utf8"),
			cipher.final(),
		]);
		/**
		 * Combine IV (16 bytes) and Encrypted Body into one payload
		 */
		return Buffer.concat([iv, encrypted]);
	}
	protected async _decrypt(value: Buffer<ArrayBufferLike>) {
		const iv = value.subarray(0, 16);
		const encryptedData = value.subarray(16);
		const decipher = crypto.createDecipheriv(
			this.#algorithm,
			this.#secretKey,
			iv
		);
		return Buffer.concat([
			decipher.update(encryptedData),
			decipher.final(),
		]).toString("utf8");
	}
	override async set(
		collection: string,
		key: string,
		value: T
	): Promise<void> {
		const filePath = this.getFilePath(collection, key);
		await fs.mkdir(dirname(filePath), { recursive: true });
		const encrypted = await this._encrypt(value);
		await writeFile(filePath, encrypted);
	}
	override async get(
		collection: string,
		key: string
	): Promise<T | undefined> {
		const filePath = this.getFilePath(collection, key);
		try {
			const encryptedBuffer = await readFile(filePath);
			const decrypted = await this._decrypt(encryptedBuffer);
			return await this.parse(decrypted);
		} catch (error: unknown) {
			if (isNotFoundOrNotDir(error)) {
				return undefined;
			}
			throw error;
		}
	}
}

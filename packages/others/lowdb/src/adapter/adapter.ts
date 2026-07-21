import { promises as fs } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import * as atomically from "atomically";
import type { AnyRecordValue, IAdapter } from "../types";
import { isNodeError, isNotFoundOrNotDir } from "../utils";

const encodeKey = encodeURIComponent;
const decodeKey = decodeURIComponent;

export interface IAdapterOptions<T extends AnyRecordValue> {
	/**
	 * Root directory where all collections to be stored/
	 *
	 * @type {string}
	 * @default "data"
	 */
	rootDir?: string;
	/**
	 * File extension for storing data
	 *
	 * @type {?string}
	 * @default "json"
	 */
	extension?: string;
	/**
	 * Implementation how to stringify the data.
	 *
	 * Default {@linkcode JSON.stringify}
	 *
	 * @type {?(value: T) => string | Promise<string>}
	 */
	stringify?: (value: T) => string | Promise<string>;
	/**
	 * Implementation how to parse the data.
	 *
	 * Default {@linkcode JSON.parse}
	 *
	 * @type {?(value: string) => T | Promise<T>}
	 */
	parse?: (value: string) => T | Promise<T>;
}

export class Adapter<T extends AnyRecordValue> implements IAdapter<T> {
	private readonly rootDir: string;
	private readonly extension: string;
	readonly stringify: (value: T) => string | Promise<string>;
	readonly parse: (value: string) => T | Promise<T>;

	protected constructor(options: IAdapterOptions<T>) {
		this.rootDir = options?.rootDir ?? "data";
		this.extension = options?.extension ?? "json";
		this.stringify = options?.stringify ?? JSON.stringify;
		this.parse = options?.parse ?? JSON.parse;
	}
	/**
	 * @private
	 * @param {string} collection - collection name
	 * @param {string} key data key
	 * @returns {string}
	 */
	getFilePath(collection: string, key: string): string {
		return join(
			this.rootDir,
			collection,
			`${encodeKey(key)}.${this.extension}`
		);
	}

	/**
	 * @private
	 * @param {string} collection - collection name
	 * @returns {string} collection directory path
	 */
	getDirPath(collection: string): string {
		return join(this.rootDir, collection);
	}

	async get(collection: string, key: string): Promise<T | undefined> {
		const filePath = this.getFilePath(collection, key);
		try {
			const buf = await atomically.readFile(filePath, "utf8");
			return await this.parse(buf);
		} catch (error: unknown) {
			if (isNotFoundOrNotDir(error)) {
				return undefined;
			}
			throw error;
		}
	}
	async set(collection: string, key: string, value: T): Promise<void> {
		const filePath = this.getFilePath(collection, key);
		await fs.mkdir(dirname(filePath), { recursive: true });
		const dataString = await this.stringify(value);
		await atomically.writeFile(filePath, dataString, "utf8");
	}
	async delete(collection: string, key: string): Promise<void> {
		const filePath = this.getFilePath(collection, key);
		try {
			await fs.unlink(filePath);
		} catch (error: unknown) {
			if (isNodeError(error) && error.code === "ENOENT") {
				return;
			}
			throw error;
		}
	}
	async keys(collection: string): Promise<string[]> {
		const dir = this.getDirPath(collection);
		try {
			const dirents = await fs.readdir(dir, { withFileTypes: true });
			return dirents
				.filter(
					(dirent) =>
						dirent.isFile() &&
						dirent.name.endsWith(`.${this.extension}`)
				)
				.map((dirent) =>
					decodeKey(basename(dirent.name, extname(dirent.name)))
				);
		} catch (error: unknown) {
			if (isNotFoundOrNotDir(error)) {
				return [];
			}
			throw error;
		}
	}
	async entries(collection: string): Promise<Array<[string, T]>> {
		const keys = await this.keys(collection);

		// Parallelize file reads
		const readPromises = keys.map(async (key) => {
			const value = await this.get(collection, key);
			return value !== undefined ? ([key, value] as [string, T]) : null;
		});

		const results = await Promise.all(readPromises);
		return results.filter((entry): entry is [string, T] => entry !== null);
	}
}

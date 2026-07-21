import type { AnyRecordValue, IAdapter } from "../types";
import { Document, type DocumentLike } from "./document";

export class Collection<T extends AnyRecordValue> {
	readonly #name: string;
	readonly #adapter: IAdapter<T>;

	constructor(name: string, adapter: IAdapter<T>) {
		this.#name = name;
		this.#adapter = adapter;
	}
	/**
	 * Get data from `key`
	 *
	 * Return empty data object if the `key` doesn't exist.
	 *
	 * @param {string} key
	 * @returns {Promise<DocumentLike<T>>}
	 */
	async get(key: string): Promise<DocumentLike<T>> {
		return Document.read<T>(this.#name, key, this.#adapter);
	}
	/**
	 * Set the `data` override existing `key` if exist.
	 *
	 * @param {string} key
	 * @param {T} value
	 * @returns {Promise<DocumentLike<T>>}
	 */
	async set(key: string, value: T): Promise<DocumentLike<T>> {
		await this.#adapter.set(this.#name, key, value);
		return Document.read<T>(this.#name, key, this.#adapter);
	}
	/**
	 * Delete the stored `key` if exist.
	 *
	 * @param {string} key
	 * @returns {Promise<void>}
	 */
	async delete(key: string): Promise<void> {
		await this.#adapter.delete(this.#name, key);
	}
	/**
	 * Get collection data keys
	 * @returns {Promise<string[]>}
	 */
	async keys(): Promise<string[]> {
		return this.#adapter.keys(this.#name);
	}
	/**
	 * @returns {Promise<[string, T][]>}
	 */
	async entries(): Promise<[string, T][]> {
		return this.#adapter.entries(this.#name);
	}
}

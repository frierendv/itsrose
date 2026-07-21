export type AnyRecordValue = any;

export interface IAdapter<T extends AnyRecordValue = AnyRecordValue> {
	/**
	 * Retrieved the data collection.
	 *
	 * @param {string} collection
	 * @param {string} key
	 * @returns {Promise<T | undefined>}
	 */
	get(collection: string, key: string): Promise<T | undefined>;
	/**
	 * Set the data collection.
	 *
	 * @param {string} collection
	 * @param {string} key
	 * @param {T} value
	 * @returns {Promise<void>}
	 */
	set(collection: string, key: string, value: T): Promise<void>;
	/**
	 * Delete the data collection key.
	 *
	 * @param {string} collection
	 * @param {string} key
	 * @returns {Promise<void>}
	 */
	delete(collection: string, key: string): Promise<void>;
	/**
	 * List all collection keys.
	 *
	 * @param {string} collection
	 * @returns {Promise<string[]>}
	 */
	keys(collection: string): Promise<string[]>;
	/**
	 * Entries all collection.
	 *
	 * @param {string} collection
	 * @returns {Promise<Array<[string, T]>>}
	 */
	entries(collection: string): Promise<Array<[string, T]>>;
}

import type { AnyRecordValue, IAdapter } from "../types";

export type DocumentLike<T extends AnyRecordValue> = T & Document<T>;
/**
 * Creates a Proxy that seamlessly merges the Document instance
 * with the properties of its underlying data object.
 */
function createDocumentProxy<T extends AnyRecordValue>(
	doc: Document<T>
): DocumentLike<T> {
	return new Proxy(doc as unknown as DocumentLike<T>, {
		get(target, prop, receiver) {
			// Check if the property exists on the Document class itself
			if (prop in target) {
				const value = Reflect.get(target, prop, receiver);
				// Bind methods to the original instance so they don't lose 'this' context
				return typeof value === "function" ? value.bind(target) : value;
			}
			// Otherwise, read from the underlying data
			const data = (target as unknown as Document<T>).toJSON();
			return data[prop as keyof T];
		},
		set(target, prop, value, receiver) {
			if (prop in target) {
				return Reflect.set(target, prop, value, receiver);
			}

			const docTarget = target as unknown as Document<T>;
			const data = docTarget.toJSON();

			data[prop as keyof T] = value as T[keyof T];
			docTarget.markDirty();

			return true;
		},
	});
}

export class Document<T extends AnyRecordValue> {
	private data: T;
	private isDirty = false;
	private exist = false;

	constructor(
		private readonly collectionName: string,
		private readonly key: string,
		private readonly adapter: IAdapter<T>,
		initialData?: T
	) {
		this.data = initialData ?? ({} as T);
		this.exist = !!initialData;
	}

	public static async read<T extends AnyRecordValue>(
		collection: string,
		key: string,
		adapter: IAdapter<T>
	): Promise<DocumentLike<T>> {
		const existingData = await adapter.get(collection, key);
		const doc = new Document<T>(collection, key, adapter, existingData);
		return createDocumentProxy<T>(doc);
	}
	/**
	 *
	 * _Stored the documnet; only if it is dirty (see {@linkcode markDirty})._
	 * @returns
	 */
	public async save(): Promise<void> {
		if (!this.isDirty) {
			return;
		}
		await this.adapter.set(this.collectionName, this.key, this.data);
		this.isDirty = false;
	}
	/**
	 * Delete the documnet
	 *
	 * @returns {Promise<void>}
	 */
	public async delete(): Promise<void> {
		await this.adapter.delete(this.collectionName, this.key);
	}

	/**
	 * Set the data and call {@linkcode markDirty}
	 *
	 * @public
	 * @param {T} value
	 * @returns {void}
	 */
	public set(value: T): void {
		this.data = value;
		this.markDirty();
	}

	public toJSON(): T {
		return this.data;
	}

	/** Mark the document dirty */
	markDirty(): void {
		this.isDirty = true;
	}

	async [Symbol.asyncDispose](): Promise<void> {
		if (this.isDirty) {
			await this.save();
		}
	}
}

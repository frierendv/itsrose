import type { AnyRecordValue, IAdapter } from "../types";
import { Collection } from "./collection";

/** Maps the database schema definitions to actual Collection instances */
export type LowCollectionHandler<
	Schema extends Record<string, AnyRecordValue>,
> = {
	[K in keyof Schema]: Collection<Schema[K]>;
};

/**
 * Re-implementation of {@link https://github.com/frierendv/surya/tree/main/packages/database | `@surya/database`}.
 * Document like database inspired by {@link https://github.com/typicode/lowdb | `lowdb`}.
 */
export class Low<Schema extends Record<string, AnyRecordValue>> {
	private readonly collections = new Map<string, Collection<any>>();
	/**
	 * Access collection via handler {@linkcode Proxy}.
	 * @public
	 * @readonly
	 */
	public readonly handler: LowCollectionHandler<Schema>;

	constructor(protected readonly adapter: IAdapter<AnyRecordValue>) {
		/** Proxy to automatically spawn collections when accessed via db.handler.users */
		this.handler = new Proxy({} as LowCollectionHandler<Schema>, {
			get: (_, prop: string | symbol) => {
				if (typeof prop === "string") {
					return this.collection(prop);
				}
				return undefined;
			},
		});
	}

	/**
	 * Get or create a typed collection by name.
	 *
	 * Collections are created lazily and cached for reuse.
	 *
	 * @public
	 * @template {Record<string, AnyRecordValue>} ColSchema
	 * @template {keyof ColSchema} [K=keyof ColSchema]
	 * @param {Extract<K, string>} name - Collection name
	 * @returns {Collection<ColSchema[K]>}
	 */
	public collection<
		ColSchema extends Record<string, AnyRecordValue> = Schema,
		K extends keyof ColSchema = keyof ColSchema,
	>(name: Extract<K, string>): Collection<ColSchema[K]> {
		let col = this.collections.get(name);
		if (!col) {
			col = new Collection<ColSchema[K]>(
				name,
				this.adapter as IAdapter<ColSchema[K]>
			);
			this.collections.set(name, col);
		}
		return col;
	}
}
